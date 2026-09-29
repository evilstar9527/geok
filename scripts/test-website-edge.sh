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
    root /fixture/public;
    add_header X-Content-Type-Options nosniff;
    location / { try_files $uri $uri/ =404; }
    location /api/ { return 200 'backend'; }
    location /report/ { return 200 'report'; }
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
mkdir -p "$fixture/public/assets" "$fixture/public/en"
printf 'official homepage' > "$fixture/public/index.html"
printf 'English homepage' > "$fixture/public/en/index.html"
for lang in '' en/; do
  for page in services-lite case-studies blog; do
    mkdir -p "$fixture/public/$lang$page"
    printf 'public page' > "$fixture/public/$lang$page/index.html"
  done
done
printf 'sitemap' > "$fixture/public/sitemap.xml"
printf 'robots' > "$fixture/public/robots.txt"
for asset in style.css main.js logo.svg font.woff2; do printf 'asset' > "$fixture/public/assets/$asset"; done
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

# Apply caching to the already protected topology, then verify real HTTP behavior.
bash "$ROOT_DIR/scripts/configure-website-cache.sh" --prepare "$fixture/fixed.conf" "$fixture/cached.conf"
bash "$ROOT_DIR/scripts/configure-website-cache.sh" --prepare "$fixture/cached.conf" "$fixture/cached-again.conf"
cmp "$fixture/cached.conf" "$fixture/cached-again.conf"
bash "$ROOT_DIR/scripts/restrict-website-hosts.sh" --prepare "$fixture/cached.conf" "$fixture/guard-again.conf"
cmp "$fixture/cached.conf" "$fixture/guard-again.conf"
reject_cache() {
  if bash "$ROOT_DIR/scripts/configure-website-cache.sh" --prepare "$1" "$fixture/rejected.conf"; then
    echo "Unsafe cache configuration accepted: $1" >&2; exit 1
  fi
}
sed 's/server_name geok.cloud;/server_name unexpected.example;/' "$fixture/fixed.conf" > "$fixture/unknown.conf"
reject_cache "$fixture/unknown.conf"
sed 's/1h;/1d;/' "$fixture/cached.conf" > "$fixture/tampered.conf"
reject_cache "$fixture/tampered.conf"
sed 's/root \/fixture\/public;/root \/fixture\/public; expires 30d;/' "$fixture/fixed.conf" > "$fixture/conflict.conf"
reject_cache "$fixture/conflict.conf"
docker run --rm --network "container:$container" --volumes-from "$container:ro" \
  -v "$fixture/cached.conf:/etc/nginx/conf.d/default.conf:ro" --entrypoint nginx "$edge_image" -t
cat "$fixture/cached.conf" > "$fixture/active.conf"
docker exec "$container" nginx -t
docker exec "$container" nginx -s reload
response_headers() {
  curl --noproxy '*' -ksS --max-time 5 --resolve "geok.cloud:$https_port:127.0.0.1" \
    -D - -o /dev/null "https://geok.cloud:$https_port$1" "${@:2}" | tr -d '\r'
}
for attempt in 1 2 3 4 5; do
  if response_headers /assets/style.css | grep -qi '^Cache-Control: max-age=3600$'; then break; fi
  sleep 1
done
for asset in style.css main.js logo.svg font.woff2; do
  response="$(response_headers "/assets/$asset?v=test")"
  [[ "$response" == *'200 OK'* ]]
  [[ "$(printf '%s\n' "$response" | grep -ic '^Cache-Control:')" == 1 ]]
  printf '%s\n' "$response" | grep -qi '^Cache-Control: max-age=3600$'
  printf '%s\n' "$response" | grep -qi '^X-Content-Type-Options: nosniff$'
done
etag="$(response_headers /assets/style.css | awk 'tolower($1)=="etag:" {print $2}')"
[[ -n "$etag" ]]
response="$(response_headers /assets/style.css -H "If-None-Match: $etag")"
[[ "$response" == *'304 Not Modified'* ]]
printf '%s\n' "$response" | grep -qi '^Cache-Control: max-age=3600$'
for path in / /en/ /index.html /en/index.html /services-lite/ /en/services-lite/ /case-studies/ /en/case-studies/ /blog/ /en/blog/ /robots.txt /sitemap.xml; do
  response_headers "$path" | grep -qi '^Cache-Control: no-cache$'
done
for path in /assets/missing.css /api/test /report/demo; do
  response="$(response_headers "$path")"
  if printf '%s\n' "$response" | grep -qi '^Cache-Control:'; then exit 1; fi
done
[[ "$(request https geok.cloud /assets/missing.css)" == 404 ]]
[[ "$(request https www.geok.cloud)" == 308 ]]
[[ "$(request https tool.geok.cloud)" == 307 ]]
[[ "$(request http geok.cloud /.well-known/acme-challenge/test)" == 200 ]]
[[ "$(request http unknown-host.invalid)" == 404 ]]
# Exercise in-place restoration through the same file bind mount used in production.
cat "$fixture/fixed.conf" > "$fixture/active.conf"
docker exec "$container" nginx -t
docker exec "$container" nginx -s reload
for attempt in 1 2 3 4 5; do
  if ! response_headers /assets/style.css | grep -qi '^Cache-Control:'; then break; fi
  sleep 1
done
if response_headers /assets/style.css | grep -qi '^Cache-Control:'; then exit 1; fi
echo 'PASS: cache scope, conditional 304, missing assets, security headers, idempotence, conflict refusal and in-place restoration'
