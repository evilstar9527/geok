#!/usr/bin/env bash
# Scope expiry to the official hostname, preserving locations and header inheritance.
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG=/opt/jianke-sites/nginx.conf
CONTAINER=jianke-sites-web
BACKUPS=/opt/jianke-sites/edge-backups
MAP="$ROOT_DIR/scripts/website-cache-map.conf"
LEGACY_MAPS=("$ROOT_DIR/scripts/website-cache-map-v1.conf" "$ROOT_DIR/scripts/website-cache-map-v2.conf")
DIRECTIVE='    expires $geok_website_cache_expiry; # geok: website cache'
fail() { echo "Website cache: $*" >&2; exit 1; }
prepare() {
  local source="$1" target="$2" managed=0
  [[ "$source" != "$target" ]] || fail 'Prepare requires a separate output file'
  [[ "$(awk '/^[ \t]*server_name[ \t]+geok\.cloud;[ \t]*$/ {n++} END {print n+0}' "$source")" == 1 ]] \
    || fail 'Expected exactly one dedicated geok.cloud server'
  if grep -Fq 'geok: website cache' "$source"; then
    managed=1
    if ! tail -n "$(wc -l < "$MAP" | tr -d ' ')" "$source" | cmp -s - "$MAP"; then
      # Accept only the exact previously deployed map, never arbitrary edits.
      local legacy_map matched=0
      for legacy_map in "${LEGACY_MAPS[@]}"; do
        if tail -n "$(wc -l < "$legacy_map" | tr -d ' ')" "$source" | cmp -s - "$legacy_map"; then
          matched=1
          break
        fi
      done
      [[ "$matched" == 1 ]] || fail 'Managed cache map changed; inspect before replacing it'
      managed=2
    fi
    [[ "$(grep -Fxc "$DIRECTIVE" "$source")" == 1 ]] || fail 'Managed expiry directive changed'
    awk '/^[ \t]*server_name[ \t]+geok\.cloud;[ \t]*$/ {getline; print}' "$source" \
      | grep -Fxq "$DIRECTIVE" || fail 'Managed expiry moved out of its expected context'
  fi
  # Keep the inspected legacy Next.js asset policy. Reject other cache controls
  # rather than silently overriding external operations configuration.
  awk -v directive="$DIRECTIVE" '
    $0 == "# geok: website cache map begin" {skip=1}
    !skip && $0 != directive {print}
  ' "$source" > "$target"
  if awk '
    /^[ \t]*location ~\* \/_next\/static\/ \{[ \t]*$/ {legacy=1; print; next}
    legacy && /^[ \t]*}[ \t]*$/ {legacy=0}
    legacy && /^[ \t]*expires 1y;[ \t]*$/ {next}
    legacy && /^[ \t]*add_header Cache-Control "public, immutable";[ \t]*$/ {next}
    {print}
  ' "$target" | grep -Eiq '(^|[;{}])[[:space:]]*expires[[:space:]]|cache-control|\$geok_website_cache_expiry|geok: website cache'; then
    fail 'Conflicting cache policy; inspect configuration first'
  fi
  # Insert only after the exact dedicated hostname; mixed HTTP redirect servers
  # and the tool hostname retain their original behavior.
  local base
  base="$(cat "$target")"
  printf '%s\n' "$base" | awk -v directive="$DIRECTIVE" '
    {print}
    /^[ \t]*server_name[ \t]+geok\.cloud;[ \t]*$/ {print directive}
  ' > "$target"
  cat "$MAP" >> "$target"
  if [[ "$managed" == 1 ]]; then
    cmp "$source" "$target" || fail 'Managed configuration differs from expected output'
  fi
}
if [[ "${1:-}" == --prepare && "$#" == 3 ]]; then prepare "$2" "$3"; exit 0; fi
[[ "$#" == 0 ]] || fail 'Usage: configure-website-cache.sh [--prepare INPUT OUTPUT]'
cd "$ROOT_DIR"
[[ "$(git branch --show-current)" == main ]] || fail 'Deployment requires main'
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail 'Tracked changes prevent deployment'
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || fail 'main must match origin/main'
[[ -f "$CONFIG" && ! -L "$CONFIG" ]] || fail 'Expected a regular edge configuration file'
docker inspect --format '{{range .Mounts}}{{println .Source .Destination}}{{end}}' "$CONTAINER" \
  | grep -Fxq "$CONFIG /etc/nginx/conf.d/default.conf" || fail 'Unexpected edge config mount'
docker exec "$CONTAINER" nginx -t
mkdir -p "$BACKUPS"
candidate="$(mktemp "$BACKUPS/cache-candidate.XXXXXX")"
backup="$BACKUPS/cache-$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD).conf"
applied=0
cleanup() {
  local result=$?
  trap - EXIT
  if [[ "$result" != 0 && "$applied" == 1 ]]; then
    cat "$backup" > "$CONFIG" # Preserve the file bind mount's inode.
    if docker exec "$CONTAINER" nginx -t && docker exec "$CONTAINER" nginx -s reload; then
      echo "Restored previous edge configuration from $backup" >&2
    else
      echo "CRITICAL: cache rollback failed; backup: $backup" >&2
    fi
  fi
  rm -f "$candidate"
  exit "$result"
}
trap cleanup EXIT
prepare "$CONFIG" "$candidate"
headers() {
  curl --noproxy '*' --silent --show-error --connect-timeout 3 --max-time 10 \
    --resolve geok.cloud:443:127.0.0.1 -I "https://geok.cloud$1" | tr -d '\r'
}
verify() {
  local path response
  for path in /assets/style.css /assets/main.js /assets/fonts.css; do
    response="$(headers "$path")" || return 1
    [[ "$response" == *'200 OK'* ]] || return 1
    [[ "$(printf '%s\n' "$response" | grep -ic '^Cache-Control:')" == 1 ]] || return 1
    printf '%s\n' "$response" | grep -iq '^Cache-Control: max-age=3600$' || return 1
    printf '%s\n' "$response" | grep -iq '^ETag:' || return 1
  done
  for path in / /en/ /whitepaper/ /en/whitepaper/ /blog/shanghai-local-geo/ /en/blog/shanghai-local-geo/ /sitemap.xml; do
    response="$(headers "$path")" || return 1
    [[ "$response" == *'200 OK'* ]] || return 1
    printf '%s\n' "$response" | grep -iq '^Cache-Control: no-cache$' || return 1
  done
  response="$(headers /assets/geok-cache-check-missing.css)" || return 1
  [[ "$response" == *'404 Not Found'* && "$response" != *'max-age=3600'* ]]
}
if cmp -s "$CONFIG" "$candidate"; then
  verify || fail 'Existing cache policy failed verification'
  echo 'Website cache already active and verified'
  exit 0
fi
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
[[ "$verified" == 1 ]] || fail 'Cache verification failed; rolling back'
# Check all existing host restrictions while rollback is still armed.
bash "$ROOT_DIR/scripts/restrict-website-hosts.sh"
applied=0
echo "Website cache verified: assets max-age=3600, pages revalidate. Backup: $backup"
