# setup.sh — Scenarios & Combinations

The `setup.sh` script is highly configurable through various flags. Below are common combinations of options and the specific scenarios where they are most useful.

## 1. The Standard "Clean Slate" Setup
**Command:**
```bash
./setup.sh
```
**When to use it:**
- You are onboarding to the project for the first time.
- You recently wiped your Docker volumes and need to reconstruct the database, cache, and default test data.
- **What it does:** Installs dependencies, boots all Docker services, applies DB migrations, creates the `demo` tenant, seeds the super admin, runs type checks, runs unit tests, and verifies the Nginx proxies.

## 2. Fast Infrastructure Reset
**Command:**
```bash
./setup.sh --infra-only --skip-tests
```
**When to use it:**
- You messed up your local database state and need to quickly reset it without waiting for frontend/backend type-checks or unit tests.
- You only need the backend/DB running to test an external integration.
- **What it does:** Rebuilds your `.env`, boots Docker, runs migrations, and seeds the database, but skips the lengthy TypeScript checks and Jest tests.

## 3. CI / Deployment Sanity Check
**Command:**
```bash
./setup.sh --with-e2e
```
**When to use it:**
- You are preparing a major PR and want to rigorously test that nothing is broken before pushing.
- You made changes to the database schema, ORM queries, or authentication flows.
- **What it does:** Runs the standard setup but explicitly executes the full, time-consuming end-to-end `k6` testing suite against the running API.

## 4. Minimalist Backend Mode (No Demo Data)
**Command:**
```bash
./setup.sh --skip-demo-tenant --skip-super-admin --skip-tests
```
**When to use it:**
- You are writing a custom seeding script and want a completely empty database with zero predefined rows to ensure your script works from scratch.
- You are testing the first-time user onboarding flow (where no tenants exist yet).

## 5. Working on AI / LLM Features
**Command:**
```bash
./setup.sh --enable-ai
```
**When to use it:**
- You are developing features that rely on the local AI knowledge bot.
- **What it does:** Overrides your `.env` settings to enable `AI_ENABLED=true` and boots up the Ollama container with the `qwen3:0.6b` model.

## 6. Low Resource / Battery Saver Mode
**Command:**
```bash
./setup.sh --disable-ai --skip-tests
```
**When to use it:**
- Your laptop is low on RAM or battery, and you are only working on frontend UI tweaks.
- **What it does:** Ensures the heavy Ollama LLM container is stopped and skips CPU-intensive test suites.
