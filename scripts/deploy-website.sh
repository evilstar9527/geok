#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_ROOT="${DEPLOY_WEBSITE_ROOT:-/opt/jianke-sites/public}"
BACKUP_ROOT="${DEPLOY_WEBSITE_BACKUPS:-/opt/jianke-sites/website-backups}"
PUBLIC_URL="${DEPLOY_WEBSITE_URL:-https://geok.cloud/}"
cd "$ROOT_DIR"

[[ "$(git branch --show-current)" == main ]] || { echo "Website deployment requires main" >&2; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Tracked changes prevent deployment" >&2; exit 1; }
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || { echo "main must match origin/main" >&2; exit 1; }
[[ -d "$PUBLIC_ROOT" && -f "$PUBLIC_ROOT/index.html" ]] || { echo "Missing existing website root: $PUBLIC_ROOT" >&2; exit 1; }
bash "$ROOT_DIR/scripts/restrict-website-hosts.sh"
mkdir -p "$BACKUP_ROOT"
release="$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"

# Reuse the installed Web image's Node runtime, without restarting any services.
docker run --rm --network none --user "$(id -u):$(id -g)" --entrypoint node \
  -v "$ROOT_DIR/apps/website:/website" \
  -v "$PUBLIC_ROOT:/public" \
  -v "$BACKUP_ROOT:/backups" \
  -w /website oneglanse-web:local \
  scripts/publish-standalone.mjs /public "/backups/$release"

live_page="$(mktemp)"
trap 'rm -f "$live_page"' EXIT
curl --fail --silent --show-error --location --max-time 30 \
  -H 'Cache-Control: no-cache' "$PUBLIC_URL" -o "$live_page"
cmp "$ROOT_DIR/apps/website/out/index.html" "$live_page" \
  || { echo "Public homepage differs from the intended release" >&2; exit 1; }
echo "Public website verified: $PUBLIC_URL ($(git rev-parse --short HEAD))"
