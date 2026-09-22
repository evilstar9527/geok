#!/usr/bin/env bash
# Integration regression for foreign-domain fall-through, using a disposable Nginx.
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT_DIR/.llmdoc-tmp"
fixture="$(mktemp -d "$ROOT_DIR/.llmdoc-tmp/edge-test.XXXXXX")"
container=""
cleanup() {
  [[ -z "$container" ]] || docker rm -f "$container" >/dev/null
  rm -rf "$fixture"
}
trap cleanup EXIT
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$fixture/key.pem" \
  -out "$fixture/cert.pem" -days 1 -subj '/CN=geok.cloud' >/dev/null 2>&1
cat > "$fixture/original.conf" <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name geok.cloud www.geok.cloud tool.geok.cloud;
    location /.well-known/acme-challenge/ { return 200 'challenge'; }
    location / { return 308 https://$host$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.geok.cloud;
    ssl_certificate /fixture/cert.pem;
    ssl_certificate_key /fixture/key.pem;
    return 308 https://geok.cloud$request_uri;
}
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name geok.cloud;
    ssl_certificate /fixture/cert.pem;
    ssl_certificate_key /fixture/key.pem;
    location / { return 200 'official homepage'; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name tool.geok.cloud;
    ssl_certificate /fixture/cert.pem;
    ssl_certificate_key /fixture/key.pem;
    return 307 /login;
}
NGINX
bash "$ROOT_DIR/scripts/restrict-website-hosts.sh" --prepare "$fixture/original.conf" "$fixture/fixed.conf"
bash "$ROOT_DIR/scripts/restrict-website-hosts.sh" --prepare "$fixture/fixed.conf" "$fixture/repeated.conf"
cmp "$fixture/fixed.conf" "$fixture/repeated.conf"
sed 's/server_name geok.cloud;/server_name unexpected.example;/' "$fixture/original.conf" > "$fixture/unknown.conf"
if bash "$ROOT_DIR/scripts/restrict-website-hosts.sh" --prepare "$fixture/unknown.conf" "$fixture/rejected.conf"; then
  echo 'Unexpected topology was accepted' >&2; exit 1
fi
cp "$fixture/original.conf" "$fixture/active.conf"
container="$(docker run -d -p 127.0.0.1::80 -p 127.0.0.1::443 \
  -v "$fixture:/fixture:ro" -v "$fixture/active.conf:/etc/nginx/conf.d/default.conf:ro" nginx:stable-alpine)"
http_port="$(docker port "$container" 80/tcp | awk -F: '{print $NF}')"
https_port="$(docker port "$container" 443/tcp | awk -F: '{print $NF}')"
request() {
  local scheme="$1" host="$2" path="${3:-/}" port="$http_port"
  [[ "$scheme" != https ]] || port="$https_port"
  curl --noproxy '*' -ksS --max-time 5 --resolve "$host:$port:127.0.0.1" \
    -o /dev/null -w '%{http_code}' "$scheme://$host:$port$path"
}
for attempt in 1 2 3 4 5; do
  if [[ "$(request https unknown-host.invalid)" == 200 ]]; then break; fi
  sleep 1
done
[[ "$(request https unknown-host.invalid)" == 200 ]]
echo 'Reproduced: unknown domain serves the official homepage'
edge_image="$(docker inspect --format '{{.Image}}' "$container")"
docker run --rm --network "container:$container" --volumes-from "$container:ro" \
  -v "$fixture/fixed.conf:/etc/nginx/conf.d/default.conf:ro" --entrypoint nginx "$edge_image" -t
cat "$fixture/fixed.conf" > "$fixture/active.conf"
docker exec "$container" nginx -t
docker exec "$container" nginx -s reload
for attempt in 1 2 3 4 5; do
  if [[ "$(request http unknown-host.invalid)" == 404 ]]; then break; fi
  sleep 1
done
[[ "$(request http unknown-host.invalid)" == 404 ]]
[[ "$(request http unknown-host.invalid /.well-known/acme-challenge/test)" == 404 ]]
for host in geok.cloud www.geok.cloud tool.geok.cloud; do
  [[ "$(request http "$host")" == 308 ]]
  [[ "$(request http "$host" /.well-known/acme-challenge/test)" == 200 ]]
done
[[ "$(request https geok.cloud)" == 200 ]]
[[ "$(request https www.geok.cloud)" == 308 ]]
[[ "$(request https tool.geok.cloud)" == 307 ]]
[[ "$(curl --noproxy '*' -ksS --max-time 5 --resolve "geok.cloud:$https_port:127.0.0.1" \
  -H 'Host: unknown-host.invalid' -o /dev/null -w '%{http_code}' "https://geok.cloud:$https_port/")" == 404 ]]
tls_status=0
request https unknown-host.invalid >/dev/null 2>&1 || tls_status=$?
[[ "$tls_status" == 35 ]]
echo 'PASS: unknown HTTP/HTTPS blocked; named hosts, redirects and ACME preserved; preparation idempotent'
