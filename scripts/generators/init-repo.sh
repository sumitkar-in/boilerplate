#!/usr/bin/env bash
#
# init-repo.sh
#
# STEP 1 of the repo bootstrap: scaffolds the three apps using their
# STANDARD CLI tools via npx. Nothing in this script hand-writes app
# boilerplate — everything comes from the real generators:
#
#   - NestJS API          → apps/api      (npx @nestjs/cli new)
#   - React (Vite) web     → apps/web      (npx create-vite)
#   - React Native (Expo)  → apps/mobile   (npx create-expo-app)
#
# This script ONLY does CLI scaffolding + git-dir cleanup. It does NOT add
# the custom multi-tenant module architecture (core/, modules/, skills/,
# scripts/generators, drizzle/, infra/docker, packages/ui-common) — that's
# layered on top by init-repo-structure.js, a separate script with its own
# job. This script calls it automatically once CLI scaffolding finishes, so
# one command produces the whole repo — but init-repo-structure.js can also
# be re-run standalone any time afterwards to re-layer/update the custom
# structure (e.g. after pulling skill/template updates) without
# re-scaffolding the apps.
#
# Usage:
#   ./init-repo.sh [target-dir] [package-manager]
#
# Examples:
#   ./init-repo.sh                   # creates ./boilerplate, uses npm
#   ./init-repo.sh my-app pnpm       # creates ./my-app, apps scaffolded for pnpm
#
# Requirements: Node.js 18+, npx available, internet access to the npm registry.
# Safe to re-run: any app whose target directory already exists is skipped.

set -euo pipefail

TARGET="${1:-boilerplate}"
PM="${2:-npm}"   # passed to nest's --package-manager flag

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log()    { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }
ok()     { printf "  \033[1;32m✔ %s\033[0m\n" "$1"; }
skip()   { printf "  \033[1;33m↷ %s (already exists, skipping)\033[0m\n" "$1"; }
run()    { printf "  \033[2m\$ %s\033[0m\n" "$*"; "$@"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

require_cmd node
require_cmd npx

mkdir -p "$TARGET"
cd "$TARGET"
ROOT="$(pwd)"

log "Bootstrapping monorepo at $ROOT (package manager: $PM)"

# ---------------------------------------------------------------------------
# 1. NestJS API — apps/api
# ---------------------------------------------------------------------------

log "Scaffolding NestJS API (apps/api) via @nestjs/cli"
if [ ! -d "apps/api" ]; then
  mkdir -p apps
  run npx -y @nestjs/cli new apps/api --skip-git --package-manager "$PM"
  ok "apps/api created"
else
  skip "apps/api"
fi

# ---------------------------------------------------------------------------
# 2. React frontend (Vite) — apps/web
# ---------------------------------------------------------------------------

log "Scaffolding React web app (apps/web) via create-vite"
if [ ! -d "apps/web" ]; then
  run npx -y create-vite@latest apps/web --template react-ts
  ok "apps/web created"
else
  skip "apps/web"
fi

# ---------------------------------------------------------------------------
# 3. React Native Expo app — apps/mobile
# ---------------------------------------------------------------------------

log "Scaffolding React Native app (apps/mobile) via create-expo-app"
if [ ! -d "apps/mobile" ]; then
  run npx -y create-expo-app@latest apps/mobile --template blank-typescript
  ok "apps/mobile created"
else
  skip "apps/mobile"
fi

# ---------------------------------------------------------------------------
# 4. Single git root
#    Each scaffolder may run its own `git init`. Strip nested .git dirs so
#    the monorepo has a single git root (initialize that yourself afterwards).
# ---------------------------------------------------------------------------

log "Removing any nested .git directories created by the CLIs"
NESTED_GIT_DIRS="$(find apps -mindepth 2 -maxdepth 2 -type d -name ".git" 2>/dev/null || true)"
if [ -n "$NESTED_GIT_DIRS" ]; then
  echo "$NESTED_GIT_DIRS" | sed 's/^/  removing: /'
  find apps -mindepth 2 -maxdepth 2 -type d -name ".git" -exec rm -rf {} + 2>/dev/null || true
else
  echo "  none found"
fi
ok "single git root preserved (run 'git init' yourself at $ROOT when ready)"

# ---------------------------------------------------------------------------
# 5. Layer the custom multi-tenant module architecture on top
# ---------------------------------------------------------------------------

log "Layering the custom architecture (core/, modules/, skills/, generators/, drizzle/, infra/) via init-repo-structure.js"
if [ -f "$SCRIPT_DIR/init-repo-structure.js" ]; then
  run node "$SCRIPT_DIR/init-repo-structure.js" "$ROOT"
else
  printf "  \033[1;33m⚠ init-repo-structure.js not found next to this script — skipping.\033[0m\n"
  echo "    Run it manually once available: node init-repo-structure.js \"$ROOT\""
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

log "Done"
echo "  Project: $ROOT"
echo ""
echo "  apps/api     → NestJS API   (cd apps/api && $PM run start:dev)"
echo "  apps/web     → React/Vite   (cd apps/web && $PM run dev)"
echo "  apps/mobile  → Expo app     (cd apps/mobile && $PM run start)"
echo ""
echo "Next steps:"
echo "  cd $(basename "$ROOT")"
echo "  docker compose -f infra/docker/docker-compose.yml up -d"
echo "  git init && git add -A && git commit -m 'Initial scaffold'"
echo ""
echo "Re-layer the custom architecture later (without re-scaffolding apps):"
echo "  node init-repo-structure.js \"$ROOT\""
echo ""
