# Multi-Tenant Boilerplate

[![CI](https://github.com/sumitkar-in/boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/sumitkar-in/boilerplate/actions/workflows/ci.yml)
[![Security](https://github.com/sumitkar-in/boilerplate/actions/workflows/weekly-security.yml/badge.svg)](https://github.com/sumitkar-in/boilerplate/actions/workflows/weekly-security.yml)
[![CodeQL](https://github.com/sumitkar-in/boilerplate/actions/workflows/codeql.yml/badge.svg)](https://github.com/sumitkar-in/boilerplate/actions/workflows/codeql.yml)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-passing-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-11-orange)
![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)

A robust, modular, multi-tenant boilerplate designed to accelerate scalable software development. Features a high-performance **NestJS REST API**, a **React + Vite** web application, and a cross-platform **React Native / Expo** mobile application — all wired together in a pnpm monorepo.

[Read more about this project on DeepWiki.](https://deepwiki.com/sumitkar-in/boilerplate)

---

## ⚡ Create a New Project

Scaffold a fresh project from this template with a **single `npx` command** — no cloning or manual renaming needed.

```bash
npx github:sumitkar-in/boilerplate <project-name>
```

### Examples

```bash
# Minimal — creates ./acme-ops/ with package name "acme-ops"
npx github:sumitkar-in/boilerplate acme-ops

# With a human-readable display name (used in UI, emails, docs)
npx github:sumitkar-in/boilerplate acme-ops --display-name="Acme Operations"

# Scaffold into the current empty directory
npx github:sumitkar-in/boilerplate .

# Pull from a specific branch (default: main)
npx github:sumitkar-in/boilerplate acme-ops --branch=develop

# Skip auto-creating a git repo in the new project
npx github:sumitkar-in/boilerplate acme-ops --skip-git
```

### What happens under the hood

| Step | What it does |
|------|-------------|
| **1. Clone** | Shallow-clones the repo from GitHub (`--depth=1`) |
| **2. Strip history** | Removes the original `.git` folder so you start clean |
| **3. Rename** | Replaces every occurrence of `boilerplate` / `Boilerplate` with your project name and display name across all source files, `package.json` manifests, and config files |
| **4. Git init** | Creates a fresh initial commit in the new project |

### After scaffolding

```bash
cd acme-ops

# Install all workspace dependencies
pnpm install

# Copy and configure environment variables
cp .env.example .env
# → Edit .env: set DATABASE_URL, REDIS_URL, JWT secrets, etc.

# Start the Dockerised infrastructure (Postgres, Redis, Nginx)
pnpm docker:up

# Run migrations and seed the super-admin account
pnpm db:fresh

# Start development servers (each in its own terminal tab)
pnpm dev:api       # NestJS API  →  https://localhost/api
pnpm dev:worker    # Background job worker
pnpm dev:web       # React web   →  https://localhost
pnpm dev:mobile    # Expo mobile (optional)
```

> **Super-admin login:** `https://localhost/super-admin/login`  
> **Default tenant:** `https://localhost` (slug: `demo`)

---

## 🔧 Rename an Existing Checkout

If you already have the repo cloned locally and just want to rename it in-place:

```bash
# Option A — use the pnpm workspace script
pnpm rename:project --name=acme-ops --display-name="Acme Operations"

# Option B — call the script directly
node scripts/rename-project.js acme-ops --display-name="Acme Operations"
```

Refresh the lockfile metadata after renaming:

```bash
pnpm install --lockfile-only
```

---

## 📁 Repository Structure

```
boilerplate/
├── apps/
│   ├── api/          NestJS REST API (multi-tenant, JWT auth, RBAC)
│   ├── web/          React + Vite frontend (shadcn/ui, Tailwind CSS)
│   └── mobile/       React Native + Expo mobile app
├── packages/
│   ├── ui-common/    Shared React components, hooks, and theming
│   └── contracts/    Shared TypeScript types, DTOs, and API schemas
├── infra/
│   └── docker/       Docker Compose services and Nginx reverse proxy
├── drizzle/          Database migration SQL files
├── docs/             Architecture docs, runbooks, and setup guides
└── scripts/          CLI generators and project scaffolding tools
```

---

## 🚀 Quick Start (existing checkout)

```bash
# 1. Start infrastructure (Postgres, Redis, Nginx)
pnpm docker:up

# 2. Install dependencies
pnpm install

# 3. Migrate and seed the database
pnpm db:fresh

# 4. Start the development servers
pnpm dev:api
pnpm dev:worker
pnpm dev:web
pnpm dev:mobile   # optional
```

---

## 🛡️ Pre-commit Hooks

Every commit automatically runs four gates via **Husky**:

1. **Lint** (`lint-staged`) — ESLint `--fix` on staged `.ts` / `.tsx` files only
2. **Tests** — All 200+ API unit tests must pass (≈ 4 s, no DB required)
3. **E2E tests** — API integration flows must pass against the local test database
4. **Security audit** (`pnpm audit --audit-level=high`) — blocks on HIGH/CRITICAL CVEs

```bash
# Run manually at any time
pnpm lint          # lint all workspaces
pnpm --filter api test  # run unit tests
pnpm --filter api test:e2e  # run e2e tests
pnpm audit --audit-level=high
```

---

## 🏗️ Code Generators

Enforce architectural consistency with built-in scaffolding generators. Always generate — never copy-paste:

```bash
# Backend module (controller + service + entity + DTOs)
pnpm generate:module --name=orders

# Database entity
pnpm generate:entity --name=order

# Full CRUD endpoints and service layer
pnpm generate:crud --name=orders

# Frontend React module (page + API client + routes + module config)
pnpm generate:frontend-module --name=orders --platform=web
```

See the `skills/` directory for architectural conventions each generator enforces.

---

## 📊 Observability Stack

The platform ships with a local Grafana + Prometheus + Loki stack.

Enable it in `.env`:

```ini
COMPOSE_PROFILES=observability,api,minio
OBSERVABILITY_ENABLED=true
```

Then run `pnpm docker:up`. Grafana is available at `https://localhost/grafana`.

---

## 📦 Releasing Versions

```bash
# Validate everything before cutting a release
pnpm release:check

# Preview the version bump (no changes written)
pnpm release:version patch --dry-run

# Apply the version bump across all workspaces
pnpm release:version patch
```

Refresh the lockfile metadata after a release:

```bash
pnpm install --lockfile-only
```

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [Local Setup Guide](docs/local-setup.md) | Prerequisites, Docker config, step-by-step setup |
| [Architecture Overview](docs/multi-tenant-modular-boilerplate-architecture.md) | NestJS architecture, request lifecycle, multi-tenancy design |
| [Operational Runbook](docs/runbook.md) | SOPs for daily operations, DB management, troubleshooting |
| [Setup Script Scenarios](docs/setup-sh-scenarios.md) | Using `./setup.sh` for environment resets and test runs |

**[Browse the full docs folder →](docs/)**
