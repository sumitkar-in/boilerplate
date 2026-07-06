#!/usr/bin/env bash
#
# setup.sh — one command to bring the whole boilerplate up locally:
# checks prerequisites, writes .env files, generates a locally-trusted HTTPS
# cert for https://localhost (via mkcert), installs deps, starts the Docker
# stack, waits for Postgres/Redis, runs migrations from inside Docker, seeds a
# demo tenant + a super admin, sanity-checks the code (type-check + unit
# tests), and verifies the Nginx front door before declaring success.
#
# Usage:
#   ./setup.sh [options]
#
# Options:
#   --infra-only        Set up Docker/DB/migrations/seed data only — don't
#                        run checks against the Nginx front door.
#   --skip-demo-tenant   Don't provision the "demo" tenant.
#   --skip-super-admin   Don't seed a platform super admin.
#   --skip-tests         Don't run the API unit test suite as a sanity check.
#   --with-e2e            Also run the (slower) API e2e test suite.
#   --enable-ai           Enable the local AI service profile and knowledge bot calls.
#   --disable-ai          Disable AI calls and skip the local AI service profile.
#   --force-ports         Deprecated; kept for compatibility and ignored.
#   -h, --help             Show this help.
#
# Re-running is safe: every step (env files, certs, docker, migrations, demo
# tenant, super admin) is idempotent / detects prior state.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="infra/docker/docker-compose.yml"
ENV_FILE=".env"
LOG_DIR="$ROOT/.dev-logs"
API_URL="https://localhost/api"
WEB_URL="https://localhost"
GRAFANA_URL="https://localhost/grafana/login"
NESTLENS_URL="https://localhost/nestlens/"
DEV_OWNER_EMAIL="owner@demo.test"
DEV_OWNER_PASSWORD="DevPassw0rd1!"
DEV_SUPER_ADMIN_EMAIL="admin@example.com"
DEV_SUPER_ADMIN_PASSWORD="SuperAdminPassw0rd1!"

INFRA_ONLY=false
SKIP_DEMO_TENANT=false
SKIP_SUPER_ADMIN=false
SKIP_TESTS=false
WITH_E2E=false
FORCE_PORTS=false
AI_MODE="unchanged"

for arg in "$@"; do
  case "$arg" in
    --infra-only) INFRA_ONLY=true ;;
    --skip-demo-tenant) SKIP_DEMO_TENANT=true ;;
    --skip-super-admin) SKIP_SUPER_ADMIN=true ;;
    --skip-tests) SKIP_TESTS=true ;;
    --with-e2e) WITH_E2E=true ;;
    --enable-ai) AI_MODE="enabled" ;;
    --disable-ai) AI_MODE="disabled" ;;
    --force-ports) FORCE_PORTS=true ;;
    -h|--help)
      sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (see --help)" >&2
      exit 1
      ;;
  esac
done

# --- output helpers -----------------------------------------------------

if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_BLUE=$'\033[34m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'
else
  C_RESET=''; C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''
fi

log_step()  { printf '\n%s==>%s %s\n' "$C_BLUE" "$C_RESET" "$1"; }
log_ok()    { printf '%s  ok%s   %s\n' "$C_GREEN" "$C_RESET" "$1"; }
log_warn()  { printf '%s  warn%s %s\n' "$C_YELLOW" "$C_RESET" "$1"; }
log_err()   { printf '%s  fail%s %s\n' "$C_RED" "$C_RESET" "$1" >&2; }
log_info()  { printf '  %s\n' "$1"; }

fail() {
  log_err "$1"
  echo
  echo "Setup did not complete. Fix the issue above and re-run ./setup.sh — it's safe to re-run from scratch." >&2
  exit 1
}

mkdir -p "$LOG_DIR"

# --- 1. prerequisites -----------------------------------------------------

log_step "Checking prerequisites"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1 ($2)"
}

require_cmd node "install from https://nodejs.org, v20+"
require_cmd pnpm "install from https://pnpm.io/installation"
require_cmd docker "install Docker Desktop (or the Docker Engine) from https://docs.docker.com/get-docker/"
require_cmd curl "should ship with your OS — install curl"

NODE_MAJOR="$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js $NODE_MAJOR found — this project needs Node 20+ (nvm install 20 or use nvm use)."
fi
log_ok "node $(node -v), pnpm $(pnpm -v)"

if ! docker compose version >/dev/null 2>&1; then
  fail "'docker compose' (v2 plugin) isn't available — update Docker Desktop / the compose plugin."
fi

if ! docker info >/dev/null 2>&1; then
  log_warn "Docker daemon isn't running."
  if [ "$(uname -s)" = "Darwin" ] && [ -d "/Applications/Docker.app" ]; then
    log_info "Attempting to start Docker Desktop..."
    open -a Docker || fail "Could not start Docker Desktop automatically. Start Docker manually and re-run."
    waited=0
    until docker info >/dev/null 2>&1; do
      if [ "$waited" -ge 60 ]; then
        fail "Docker daemon still isn't up after 60s. Start Docker Desktop manually and re-run."
      fi
      sleep 2
      waited=$((waited + 2))
    done
  else
    fail "Start Docker (Docker Desktop, or 'sudo systemctl start docker' on Linux) and re-run."
  fi
fi
log_ok "Docker daemon is running"

# --- 2. env files -----------------------------------------------------

log_step "Checking .env files"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.example "$ENV_FILE"
  log_ok "Created $ENV_FILE from .env.example"
else
  log_ok "$ENV_FILE already exists"
fi

if [ ! -f "apps/web/.env" ]; then
  cp apps/web/.env.example apps/web/.env
  log_ok "Created apps/web/.env from apps/web/.env.example"
else
  log_ok "apps/web/.env already exists"
fi

set_env_var() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) print key "=" value
    }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

# The api/worker Docker services always run with NODE_ENV=production (see
# infra/docker/docker-compose.yml), and the API refuses to boot in
# production with a JWT_SECRET under 32 chars — so leaving the placeholder
# here isn't just insecure, it breaks `docker compose up` outright. Replace
# it with a real random secret instead of just warning.
if grep -q '^JWT_SECRET=change_me$' "$ENV_FILE"; then
  new_jwt_secret="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
  set_env_var JWT_SECRET "$new_jwt_secret"
  log_ok "Generated a random JWT_SECRET (was the insecure placeholder)"
fi

# Same idea for the Grafana/pgAdmin admin passwords: fine as fixed dev
# defaults, but generate real values instead of shipping guessable ones.
if grep -q '^INFRA_ADMIN_PASSWORD=admin123$' "$ENV_FILE"; then
  new_admin_password="$(node -e 'process.stdout.write(require("crypto").randomBytes(16).toString("hex"))')"
  set_env_var INFRA_ADMIN_PASSWORD "$new_admin_password"
  log_ok "Generated a random INFRA_ADMIN_PASSWORD (was the insecure placeholder)"
fi

if grep -q '^GRAFANA_VIEWER_PASSWORD=viewer123$' "$ENV_FILE"; then
  new_viewer_password="$(node -e 'process.stdout.write(require("crypto").randomBytes(16).toString("hex"))')"
  set_env_var GRAFANA_VIEWER_PASSWORD "$new_viewer_password"
  log_ok "Generated a random GRAFANA_VIEWER_PASSWORD (was the insecure placeholder)"
fi

remove_profile_value() {
  local value="$1" current next
  current="$(grep -E '^COMPOSE_PROFILES=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  next="$(printf '%s' "$current" | tr ',' '\n' | awk -v value="$value" 'NF && $0 != value { rows[++n] = $0 } END { for (i = 1; i <= n; i++) printf "%s%s", rows[i], i < n ? "," : "" }')"
  set_env_var COMPOSE_PROFILES "$next"
}

ensure_profile_value() {
  local value="$1" current
  current="$(grep -E '^COMPOSE_PROFILES=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  if printf '%s' "$current" | tr ',' '\n' | grep -qx "$value"; then
    set_env_var COMPOSE_PROFILES "$current"
  elif [ -n "$current" ]; then
    set_env_var COMPOSE_PROFILES "$current,$value"
  else
    set_env_var COMPOSE_PROFILES "$value"
  fi
}

if [ "$AI_MODE" = "enabled" ]; then
  set_env_var AI_ENABLED true
  set_env_var AI_SERVICE_URL http://ai:8000
  set_env_var OLLAMA_BASE_URL http://192.168.0.178:11434
  set_env_var OLLAMA_MODEL qwen3:0.6b
  ensure_profile_value ai
  log_ok "AI functionality enabled (Ollama model: qwen3:0.6b; override OLLAMA_MODEL in .env)"
elif [ "$AI_MODE" = "disabled" ]; then
  set_env_var AI_ENABLED false
  remove_profile_value ai
  log_ok "AI functionality disabled"
fi

# --- 3. local HTTPS certs -----------------------------------------------------
#
# Nginx needs a cert for https://localhost. scripts/generate-dev-certs.sh
# generates it on the host (not baked into the Docker image) so we can make
# the browser actually trust it: mkcert issues certs signed by a local CA and
# installs that CA into the OS/browser trust stores, so there's no
# click-through security warning. Falls back to a plain openssl self-signed
# cert if mkcert isn't available. Shared with the "predocker:up" pnpm hook so
# `pnpm docker:up` on its own is also safe.

log_step "Setting up local HTTPS certs"
bash scripts/generate-dev-certs.sh

# --- 4. install dependencies -----------------------------------------------------

log_step "Installing dependencies (pnpm install)"
if pnpm install > "$LOG_DIR/install.log" 2>&1; then
  log_ok "Dependencies installed"
else
  tail -n 40 "$LOG_DIR/install.log" >&2
  fail "pnpm install failed — see $LOG_DIR/install.log for the full log"
fi

# --- 5. docker services -----------------------------------------------------

log_step "Starting Docker services"
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build > "$LOG_DIR/docker-up.log" 2>&1; then
  tail -n 40 "$LOG_DIR/docker-up.log" >&2
  fail "docker compose up failed — see $LOG_DIR/docker-up.log"
fi
log_ok "Containers starting"

compose_exec() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$@"
}

compose_run_api_node() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps api node "$@"
}

log_info "Waiting for Postgres..."
waited=0
until compose_exec postgres pg_isready -U postgres -d app_db >/dev/null 2>&1; do
  if [ "$waited" -ge 60 ]; then
    fail "Postgres didn't become ready within 60s. Check: docker compose -f $COMPOSE_FILE logs postgres"
  fi
  sleep 1
  waited=$((waited + 1))
done
log_ok "Postgres is ready"

log_info "Waiting for Redis..."
waited=0
until [ "$(compose_exec redis redis-cli ping 2>/dev/null | tr -d '\r')" = "PONG" ]; do
  if [ "$waited" -ge 30 ]; then
    fail "Redis didn't become ready within 30s. Check: docker compose -f $COMPOSE_FILE logs redis"
  fi
  sleep 1
  waited=$((waited + 1))
done
log_ok "Redis is ready"

env_value() {
  grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true
}

if [ "$(env_value AI_ENABLED)" = "true" ]; then
  log_info "Waiting for AI service..."
  waited=0
  until compose_exec ai python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)" >/dev/null 2>&1; do
    if [ "$waited" -ge 90 ]; then
      fail "AI service didn't become ready within 90s. Check Ollama and: docker compose -f $COMPOSE_FILE logs ai"
    fi
    sleep 2
    waited=$((waited + 2))
  done
  log_ok "AI service is ready"
fi

# --- 6. migrations -----------------------------------------------------

log_step "Applying core migrations"
if compose_run_api_node scripts/database/migrate-core.js > "$LOG_DIR/migrate-core.log" 2>&1; then
  log_ok "Core schema up to date"
else
  tail -n 40 "$LOG_DIR/migrate-core.log" >&2
  fail "migrate:core failed — see $LOG_DIR/migrate-core.log"
fi

log_step "Applying tenant schemas & feature migrations"
if compose_run_api_node scripts/database/migrate-tenants.js > "$LOG_DIR/migrate-tenants.log" 2>&1; then
  log_ok "Tenant schemas up to date"
else
  tail -n 40 "$LOG_DIR/migrate-tenants.log" >&2
  fail "migrate:tenants failed — see $LOG_DIR/migrate-tenants.log"
fi

# --- 7. seed data -----------------------------------------------------

db_query() {
  compose_exec postgres psql -U postgres -d app_db -tAc "$1" 2>/dev/null | tr -d '\r' | tr -d '[:space:]'
}

if [ "$SKIP_DEMO_TENANT" = false ]; then
  log_step "Provisioning demo tenant"
  if [ "$(db_query "SELECT 1 FROM tenants WHERE slug='demo' LIMIT 1")" = "1" ]; then
    log_ok "Tenant \"demo\" already exists — skipping"
  else
    if compose_run_api_node scripts/database/create-tenant.js \
      --slug=demo --features=all \
      --owner-email="$DEV_OWNER_EMAIL" --owner-password="$DEV_OWNER_PASSWORD" \
      > "$LOG_DIR/tenant-create.log" 2>&1; then
      log_ok "Created tenant \"demo\" (owner: $DEV_OWNER_EMAIL / $DEV_OWNER_PASSWORD)"
    else
      tail -n 40 "$LOG_DIR/tenant-create.log" >&2
      fail "tenant:create failed — see $LOG_DIR/tenant-create.log"
    fi
  fi
fi

if [ "$SKIP_SUPER_ADMIN" = false ]; then
  log_step "Seeding super admin"
  if [ ! -f "scripts/database/seed-super-admin.js" ]; then
    log_warn "scripts/database/seed-super-admin.js not found — skipping (not present in this checkout)"
  else
    if compose_run_api_node scripts/database/seed-super-admin.js \
      --email="$DEV_SUPER_ADMIN_EMAIL" --password="$DEV_SUPER_ADMIN_PASSWORD" \
      > "$LOG_DIR/seed-super-admin.log" 2>&1; then
      log_ok "Super admin ready ($DEV_SUPER_ADMIN_EMAIL / $DEV_SUPER_ADMIN_PASSWORD)"
    else
      tail -n 40 "$LOG_DIR/seed-super-admin.log" >&2
      fail "seed:super-admin failed — see $LOG_DIR/seed-super-admin.log"
    fi
  fi
fi

# --- 8. sanity-check the code -----------------------------------------------------

log_step "Type-checking apps/api"
if (cd apps/api && pnpm exec tsc --noEmit -p tsconfig.json) > "$LOG_DIR/tsc-api.log" 2>&1; then
  log_ok "apps/api type-checks cleanly"
else
  tail -n 60 "$LOG_DIR/tsc-api.log" >&2
  fail "apps/api has type errors — see $LOG_DIR/tsc-api.log"
fi

log_step "Type-checking apps/web"
if (cd apps/web && pnpm exec tsc -b) > "$LOG_DIR/tsc-web.log" 2>&1; then
  log_ok "apps/web type-checks cleanly"
else
  tail -n 60 "$LOG_DIR/tsc-web.log" >&2
  fail "apps/web has type errors — see $LOG_DIR/tsc-web.log"
fi

if [ "$SKIP_TESTS" = false ]; then
  log_step "Running apps/api unit tests"
  if (cd apps/api && pnpm exec jest) > "$LOG_DIR/test-unit.log" 2>&1; then
    log_ok "Unit tests passed"
  else
    tail -n 60 "$LOG_DIR/test-unit.log" >&2
    fail "Unit tests failed — see $LOG_DIR/test-unit.log"
  fi
fi

if [ "$WITH_E2E" = true ]; then
  log_step "Running full end-to-end k6 test suite"
  
  if command -v k6 >/dev/null 2>&1; then
    log_info "Executing k6 tests (this may take a minute depending on load profile)..."
    if SUPERADMIN_EMAIL="$DEV_SUPER_ADMIN_EMAIL" SUPERADMIN_PASSWORD="$DEV_SUPER_ADMIN_PASSWORD" API_URL="$API_URL" k6 run --insecure-skip-tls-verify tests/k6/main.js > "$LOG_DIR/k6-e2e.log" 2>&1; then
      log_ok "k6 end-to-end tests passed"
    else
      tail -n 60 "$LOG_DIR/k6-e2e.log" >&2
      fail "k6 end-to-end tests failed — see $LOG_DIR/k6-e2e.log"
    fi
  else
    log_warn "k6 is not installed on your machine. Skipping end-to-end tests."
    log_info "Install k6 from https://k6.io/docs/get-started/installation/"
  fi
fi

if [ "$INFRA_ONLY" = true ]; then
  echo
  log_ok "Infra + migrations + seed data ready. Skipping Nginx checks (--infra-only)."
  exit 0
fi

# --- 9. verify Nginx front door -----------------------------------------------------

wait_for_http() {
  local url="$1" timeout="$2" waited=0
  until curl -kfsS -o /dev/null "$url" 2>/dev/null; do
    if [ "$waited" -ge "$timeout" ]; then return 1; fi
    sleep 1
    waited=$((waited + 1))
  done
  return 0
}

log_step "Verifying Nginx front door"
log_info "Waiting for $WEB_URL to respond..."
if wait_for_http "$WEB_URL/" 120; then
  log_ok "Frontend is available through Nginx"
else
  fail "Frontend did not respond through Nginx within 120s. Check: docker compose -f $COMPOSE_FILE logs nginx"
fi

log_info "Waiting for $API_URL to respond..."
if wait_for_http "$API_URL/" 120; then
  log_ok "API is available through Nginx"
else
  fail "API did not respond through Nginx within 120s. Check: docker compose -f $COMPOSE_FILE logs api nginx"
fi

log_info "Waiting for Grafana at $GRAFANA_URL..."
if wait_for_http "$GRAFANA_URL" 120; then
  log_ok "Grafana is available through Nginx"
else
  fail "Grafana did not respond through Nginx within 120s. Check: docker compose -f $COMPOSE_FILE logs grafana nginx"
fi

# --- 10. summary -----------------------------------------------------

echo
echo "${C_GREEN}Everything is up.${C_RESET}"
echo
echo "  Web:        $WEB_URL"
echo "  API:        $API_URL"
echo "  Grafana:    https://localhost/grafana/ (admin credentials: see INFRA_ADMIN_PASSWORD in $ENV_FILE)"
echo "  NestLens:   $NESTLENS_URL (available only when the API is not running in production mode)"
if [ "$SKIP_DEMO_TENANT" = false ]; then
  echo
  echo "  Demo tenant login  — slug: demo, email: $DEV_OWNER_EMAIL, password: $DEV_OWNER_PASSWORD"
  echo "  Tenant Login URL    — $WEB_URL/login"
fi
if [ "$SKIP_SUPER_ADMIN" = false ] && [ -f "scripts/database/seed-super-admin.js" ]; then
  echo "  Super admin login  — email: $DEV_SUPER_ADMIN_EMAIL, password: $DEV_SUPER_ADMIN_PASSWORD"
  echo "  Super admin URL    — $WEB_URL/super-admin/login"
fi
echo
echo "  Logs: docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop Docker services: pnpm docker:down"
echo
