#!/usr/bin/env bash
# Add a rejecting default to the existing edge; preserve all named hosts and locations.
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG=/opt/jianke-sites/nginx.conf
CONTAINER=jianke-sites-web
DEFAULTS="$ROOT_DIR/scripts/website-edge-default.conf"
BACKUPS=/opt/jianke-sites/edge-backups

fail() { echo "Website edge: $*" >&2; exit 1; }
prepare() {
  local source="$1" target="$2"
  [[ "$source" != "$target" ]] || fail 'Prepare requires a separate output file'
  if grep -Fq '# geok: reject unknown hosts' "$source"; then
    head -n "$(wc -l < "$DEFAULTS" | tr -d ' ')" "$source" | cmp - "$DEFAULTS" \
      || fail 'Existing managed default differs; inspect before replacing it'
    cat "$source" > "$target"
    return
  fi
  # Refuse to rewrite a topology we have not inspected.
  [[ "$(awk '/^[ \t]*listen[ \t].*default_server/ {n++} END {print n+0}' "$source")" == 4 ]] \
    || fail 'Unexpected number of existing default listeners'
  [[ "$(awk '/^[ \t]*server_name[ \t]/ {n++; for(i=2;i<=NF;i++) {gsub(/;/,"",$i); if ($i !~ /^(geok\.cloud|www\.geok\.cloud|tool\.geok\.cloud)$/) bad=1}} END {print n ":" bad+0}' "$source")" == '4:0' ]] \
    || fail 'Unexpected named hosts; inspect configuration first'
  cat "$DEFAULTS" > "$target"
  awk '/^[ \t]*listen[ \t]/ {gsub(/[ \t]+default_server/, "")} {print}' "$source" >> "$target"
}

# A pure preparation path allows routing tests without access to production.
if [[ "${1:-}" == --prepare && "$#" == 3 ]]; then
  prepare "$2" "$3"
  exit 0
fi
[[ "$#" == 0 ]] || fail 'Usage: restrict-website-hosts.sh [--prepare INPUT OUTPUT]'
cd "$ROOT_DIR"
[[ "$(git branch --show-current)" == main ]] || fail 'Deployment requires main'
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail 'Tracked changes prevent deployment'
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || fail 'main must match origin/main'
[[ -f "$CONFIG" && ! -L "$CONFIG" ]] || fail 'Expected a regular edge configuration file'
docker inspect --format '{{range .Mounts}}{{println .Source .Destination}}{{end}}' "$CONTAINER" \
  | grep -Fxq "$CONFIG /etc/nginx/conf.d/default.conf" || fail 'Unexpected edge config mount'
docker exec "$CONTAINER" nginx -t

status() {
  local scheme="$1" host="$2" port="$3" path="${4:-/}"
  curl --noproxy '*' --silent --show-error --connect-timeout 3 --max-time 10 \
    --resolve "$host:$port:127.0.0.1" -o /dev/null -w '%{http_code}' "$scheme://$host$path"
}

verify() {
  [[ "$(status https geok.cloud 443)" == 200 ]] || return 1
  [[ "$(status https geok.cloud 443 /case-studies/)" == 200 ]] || return 1
  [[ "$(status https geok.cloud 443 /sitemap.xml)" == 200 ]] || return 1
  [[ "$(status https www.geok.cloud 443)" == 308 ]] || return 1
  [[ "$(status https tool.geok.cloud 443)" == 307 ]] || return 1
  for host in geok.cloud www.geok.cloud tool.geok.cloud; do
    [[ "$(status http "$host" 80)" == 308 ]] || return 1
  done
  [[ "$(status http unknown-host.invalid 80)" == 404 ]] || return 1
  [[ "$(curl --noproxy '*' -sS --connect-timeout 3 --max-time 10 \
    --resolve geok.cloud:443:127.0.0.1 -H 'Host: unknown-host.invalid' \
    -o /dev/null -w '%{http_code}' https://geok.cloud/)" == 404 ]] || return 1
  # Even a client ignoring certificate validation must fail the unknown SNI handshake.
  local tls_status=0
  curl --noproxy '*' -ksS --connect-timeout 3 --max-time 10 \
    --resolve unknown-host.invalid:443:127.0.0.1 \
    https://unknown-host.invalid/ -o /dev/null 2>/dev/null || tls_status=$?
  [[ "$tls_status" == 35 ]]
}

if grep -Fq '# geok: reject unknown hosts' "$CONFIG"; then
  head -n "$(wc -l < "$DEFAULTS" | tr -d ' ')" "$CONFIG" | cmp - "$DEFAULTS" \
    || fail 'Existing managed default differs; inspect before replacing it'
  verify || fail 'Existing host restrictions failed verification'
  echo 'Website edge host restrictions already active and verified'
  exit 0
fi

[[ "$(status https geok.cloud 443)" == 200 ]] || fail 'Homepage is unhealthy before change'
mkdir -p "$BACKUPS"
candidate="$(mktemp "$BACKUPS/candidate.XXXXXX")"
backup="$BACKUPS/nginx-$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD).conf"
applied=0
cleanup() {
  local result=$?
  trap - EXIT
  if [[ "$result" != 0 && "$applied" == 1 ]]; then
    # The config is a file bind mount: preserve its inode when writing/restoring.
    cat "$backup" > "$CONFIG"
    if docker exec "$CONTAINER" nginx -t && docker exec "$CONTAINER" nginx -s reload; then
      echo "Restored previous edge configuration from $backup" >&2
    else
      echo "CRITICAL: edge rollback failed; backup: $backup" >&2
    fi
  fi
  rm -f "$candidate"
  exit "$result"
}
trap cleanup EXIT
prepare "$CONFIG" "$candidate"

# Test against the running edge image, mounts, certificates and network before writing.
edge_image="$(docker inspect --format '{{.Image}}' "$CONTAINER")"
docker run --rm --network "container:$CONTAINER" --volumes-from "$CONTAINER:ro" \
  -v "$candidate:/etc/nginx/conf.d/default.conf:ro" --entrypoint nginx "$edge_image" -t
cp -p "$CONFIG" "$backup"
applied=1
cat "$candidate" > "$CONFIG"
docker exec "$CONTAINER" nginx -t
docker exec "$CONTAINER" nginx -s reload
verified=0
for attempt in 1 2 3 4 5; do
  if verify; then verified=1; break; fi
  sleep 1
done
[[ "$verified" == 1 ]] || fail 'Host routing verification failed; rolling back'
applied=0
echo "Website edge verified: named hosts work; unknown HTTP hosts and TLS names rejected. Backup: $backup"
