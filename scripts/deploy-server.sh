#!/usr/bin/env bash
# Pull main and deploy the production stack on the server without touching data volumes.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.server.yml)
if [[ -f docker-compose.override.yml ]]; then
  COMPOSE+=(-f docker-compose.override.yml)
fi
TARGET_BRANCH="${DEPLOY_BRANCH:-main}"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/login}"

log() { printf '\n[%s] %s\n' "$(date '+%F %T')" "$*"; }
fail() { printf '\n部署失败：%s\n' "$*" >&2; exit 1; }

cd "$ROOT_DIR"

command -v git >/dev/null 2>&1 || fail "服务器未安装 git"
command -v docker >/dev/null 2>&1 || fail "服务器未安装 docker"
docker compose version >/dev/null 2>&1 || fail "服务器未安装 Docker Compose 插件"
docker info >/dev/null 2>&1 || fail "当前用户无权访问 Docker"
[[ -f .env ]] || fail "缺少 $ROOT_DIR/.env，请先配置生产环境变量"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "服务器仓库存在未提交修改，请先处理后再部署"
fi

log "拉取 origin/$TARGET_BRANCH"
git fetch origin "$TARGET_BRANCH"
git checkout "$TARGET_BRANCH"
git pull --ff-only origin "$TARGET_BRANCH"

if [[ ! -f camoufox-lin.x86_64.zip ]]; then
  fail "缺少 camoufox-lin.x86_64.zip，Agent 服务器镜像无法构建"
fi

docker network inspect oneglanse-edge >/dev/null 2>&1 \
  || docker network create oneglanse-edge >/dev/null

log "使用服务器专用 Dockerfile 构建并启动"
"${COMPOSE[@]}" up -d --build --remove-orphans

log "等待 Web 服务健康"
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null 2>&1; then
    log "部署成功：$(git rev-parse --short HEAD)"
    "${COMPOSE[@]}" ps
    exit 0
  fi
  sleep 3
done

"${COMPOSE[@]}" ps >&2 || true
docker logs --tail 120 oneglanse-web >&2 || true
fail "Web 服务在 180 秒内未通过健康检查：$HEALTH_URL"
