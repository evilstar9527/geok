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

AGENT_BROWSER_IMAGE="${ONEGLANSE_AGENT_BROWSER_IMAGE:-oneglanse-agent-browser:local}"
if ! docker image inspect "$AGENT_BROWSER_IMAGE" >/dev/null 2>&1 \
  || ! docker run --rm --network none --entrypoint python3 "$AGENT_BROWSER_IMAGE" -c \
    'from pathlib import Path; from camoufox.addons import DefaultAddons, get_addon_path, confirm_paths; from camoufox.pkgman import INSTALL_DIR; confirm_paths([get_addon_path(a.name) for a in DefaultAddons]); assert any(p.stat().st_size > 0 for p in (INSTALL_DIR / "geoip" / "mmdb").glob("*.mmdb")), "GeoIP database missing"'; then
  log "首次构建 Agent 浏览器基础镜像"
  "${COMPOSE[@]}" --profile build build agent-browser-base
fi

docker network inspect oneglanse-edge >/dev/null 2>&1 \
  || docker network create oneglanse-edge >/dev/null

log "使用服务器专用 Dockerfile 构建并启动"
log "同步 ClickHouse 表结构"
"${COMPOSE[@]}" up -d clickhouse

# `up -d` returns once the container has started, not once ClickHouse is
# accepting connections, so the schema sync below raced the server's startup and
# aborted the whole deploy with "Cannot connect to localhost on port 9000". That
# only shows up when this deploy has to *recreate* clickhouse — a config change
# such as the logging block — which is precisely when the sync is most likely to
# matter. Wait for a query to answer before feeding it the schema.
clickhouse_ready=""
for attempt in $(seq 1 60); do
  if docker exec clickhouse_db clickhouse-client --query "SELECT 1" >/dev/null 2>&1; then
    clickhouse_ready=1
    break
  fi
  sleep 2
done
[[ -n "$clickhouse_ready" ]] || fail "ClickHouse 在 120 秒内未就绪"

docker exec -i clickhouse_db clickhouse-client --multiquery < packages/db/clickhouse-init/schema.sql

if ! docker exec clickhouse_db clickhouse-client --query \
  "SELECT sorting_key FROM system.tables WHERE database = 'analytics' AND name = 'prompt_responses'" \
  | grep -q response_sort_id; then
  log "迁移提示词回答表，保留同一提示词的重复采样"
  docker exec clickhouse_db clickhouse-client --query \
    "ALTER TABLE analytics.prompt_responses DROP COLUMN IF EXISTS response_sort_id"
  docker exec clickhouse_db clickhouse-client --query \
    "ALTER TABLE analytics.prompt_responses ADD COLUMN response_sort_id String, MODIFY ORDER BY (workspace_id, prompt_run_at, model_provider, prompt_id, response_sort_id)"
fi

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
