# Multi-Tenant Modular Boilerplate — Architecture

**Purpose:** A generic, reusable backend boilerplate — modular, multi-tenant, extendable.

Design goals, in order of priority:

1. **Modular** — every feature is a self-contained module that can be added/removed without touching others.
2. **Tenant-separated** — each tenant's data lives in its own database schema, not just a `tenant_id` column.
3. **Feature-toggleable per tenant** — a module/feature can be on for Tenant A and off for Tenant B.
4. **Easy migrations** — one command migrates the core schema and every tenant schema, and provisioning a new tenant is one function call.
5. **Extendable** — adding a new feature/domain later means adding a new module folder, not restructuring the app.

---

## 1. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | NestJS + TypeScript | Modular by design (modules/providers/DI), easy to enforce boundaries |
| Database | PostgreSQL 16+ | Native schema support → clean tenant separation |
| ORM / Migrations | Drizzle ORM + drizzle-kit | Simple, explicit SQL-like migrations; easy to run per-schema |
| Queue | BullMQ + Redis | Background jobs, retries, delays — needed for any async feature (e.g. WhatsApp sending later) |
| Scheduling | `@nestjs/schedule` + BullMQ repeatable jobs | Cron jobs — both in-process (`@Cron()`) and queue-backed (for jobs that must survive a restart or run tenant-by-tenant) |
| Cache | Redis | Sessions, rate limits, feature-flag cache |
| Auth | JWT + refresh token | Standard stateless auth, tenant-aware |
| Frontend | React + Vite + TypeScript | Simple SPA, no special framework requirement |
| Mobile | React Native + Expo + TypeScript | Shares language/types/business-logic patterns with the web app; Expo keeps native builds (EAS) and OTA updates simple without ejecting |
| Object storage | S3-compatible | Optional, only used by modules that need file/media storage |
| Deployment | Docker Compose | Single command local/prod bring-up |

No GraphQL, no metadata engine, no SDK/CLI publishing pipeline — this is intentionally a plain modular monolith, not a platform-builder. Extensibility comes from the module pattern (§4); generators are convenience scaffolds that must follow and smoke-test that pattern, not a separate platform layer.

---

## 2. High-Level Architecture

```text
Browser                          Mobile Device
  │                                 │
  ▼                                 ▼
React Frontend (Vite)        React Native App (Expo)
  │                                 │
  └────────────┬────────────────────┘
               │  REST API calls (JWT + tenant header)
               ▼
NestJS API Server
  │
  ├── Tenant Resolver Middleware  → resolves TenantContext for every request
  ├── Feature Flag Guard          → blocks disabled modules per tenant
  ├── Core Modules                → auth, tenants, users, feature-flags
  ├── Feature Modules             → pluggable, one per domain (e.g. whatsapp, billing, crm...)
  └── Background Worker (BullMQ)  → async jobs per feature module
        │
        ▼
PostgreSQL
  core schema        → tenants, users, memberships, feature_flags, audit_logs
  tenant_<slug> schema → only the tables owned by modules enabled for that tenant
        │
        ▼
Redis (queues, cache, rate limits)
```

Both clients talk to the same REST API and carry the same `TenantContext` resolution (JWT + tenant header) — the mobile app isn't a second backend integration, it's a second consumer of the same feature-flagged routes the web app uses.

---

## 3. Repository Structure

Mostly a single deployable app, organized by module — plus one small shared package for the UI building blocks every frontend module reuses (§11).

```text
boilerplate/
├── apps/
│   ├── api/                       # NestJS API + worker (can split into two processes later)
│   │   └── src/
│   │       ├── core/              # Platform code — see §5
│   │       ├── modules/           # Feature modules — see §4
│   │       ├── database/          # Migration runner, schema provisioning
│   │       ├── app.module.ts
│   │       └── main.ts
│   ├── web/                       # React shell + micro-frontend host — see §11
│   │   └── src/
│   │       ├── modules/           # One folder per feature, mirrors backend modules — loaded as micro-frontends
│   │       ├── core/              # Auth, tenant switcher, shell layout, module loader
│   │       └── main.tsx
│   └── mobile/                    # React Native (Expo) app — see §11.4
│       └── src/
│           ├── modules/           # Same module shape as apps/web, screens instead of routes
│           ├── core/              # Auth, tenant switcher, navigation shell, module loader
│           └── App.tsx
│
├── packages/
│   └── ui-common/                 # Shared logic/hooks (and web-only components) — see §11
│       └── src/
│           ├── components/        # Button, Modal, AdvancedDataTable, Form fields — web (DOM) only
│           ├── hooks/              # useTenant(), useFeatureFlag(), useApi() — shared by web + mobile
│           ├── api/                # createHttpClient(), buildQueryString() — shared fetch transport
│           └── index.ts
│
├── infra/
│   └── docker/
│       └── docker-compose.yml
│
├── drizzle/
│   ├── core/                      # Core schema migrations
│   └── tenant/                    # Tenant schema migrations (applied to every tenant schema)
│
├── scripts/
│   └── generators/                # Code-generation scripts — see §10
│       ├── generate-module.js
│       ├── generate-entity.js
│       ├── generate-cron-job.js
│       ├── generate-frontend-module.js
│       └── _templates/
│
├── skills/                        # Markdown "how we build things here" references — see §10
│   ├── nestjs-module/SKILL.md
│   ├── tenant-data-access/SKILL.md
│   ├── cron-jobs/SKILL.md
│   ├── feature-flags/SKILL.md
│   └── frontend-module/SKILL.md
│
├── .env.example
├── package.json
└── README.md
```

---

## 4. The Module Pattern (this is what makes it extendable)

Every feature — including the WhatsApp automation feature you'll build next — is a **self-contained module** following the same shape:

```text
apps/api/src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── dto/
├── entities/                      # Drizzle table definitions owned by this module
├── jobs/                          # BullMQ processors, if the feature needs async work
├── cron/                          # Scheduled tasks owned by this module — see §9
├── migrations/                    # Module-owned migration files (tenant schema)
└── feature.json                   # { key: "whatsapp", label: "WhatsApp Automation", defaultEnabled: false }
```

### Rules that keep this extendable

1. **A module only touches its own tables.** No module imports another module's `entities/` directly — cross-feature data access goes through the other module's exported service.
2. **A module declares its own migrations.** Adding a feature means dropping a new folder under `modules/` with its own `migrations/`; the migration runner picks it up automatically (§8) — no central migration file to edit.
3. **A module is toggleable.** Every module ships a `feature.json` key. The `FeatureFlagGuard` checks it before any of the module's routes/jobs run for a given tenant.
4. **A module can be deleted.** Since nothing outside it references its tables directly, removing a module folder (and its tables) doesn't break other features.

To add the WhatsApp feature later, you literally add `modules/whatsapp/` with its own controller/service/entities/jobs/migrations — nothing in `core/` changes.

---

## 5. Core Platform Code

```text
apps/api/src/core/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts          # POST /auth/login, /auth/refresh
│   ├── jwt.strategy.ts
│   └── auth.service.ts
│
├── tenants/
│   ├── tenants.module.ts
│   ├── tenants.controller.ts       # tenant CRUD (admin only)
│   ├── tenants.service.ts
│   ├── tenant-context.ts           # TenantContext type + AsyncLocalStorage holder
│   ├── tenant-resolver.middleware.ts
│   └── tenant-provisioning.service.ts
│
├── feature-flags/
│   ├── feature-flags.module.ts
│   ├── feature-flags.service.ts    # isEnabled(tenantId, featureKey)
│   └── feature-flag.guard.ts
│
├── users/
│   ├── users.module.ts
│   └── users.service.ts
│
└── common/
    ├── decorators/                 # @CurrentTenant(), @RequireFeature('whatsapp')
    ├── guards/
    ├── filters/
    └── pipes/
```

### Tenant Context

```ts
export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  schemaName: string;       // e.g. "tenant_acme"
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  enabledFeatures: Set<string>;
};
```

Resolved once per request by `tenant-resolver.middleware.ts`, from (in order): subdomain → `x-tenant-id` header → JWT claim. Stored in `AsyncLocalStorage` so any service can read it via `@CurrentTenant()` without threading it through every function call manually.

### Data access rule (unchanged from before, still the most important rule)

```ts
// Good — every query is tenant-scoped
contactsService.findAll(tenantContext, filters);

// Avoid — never query a tenant table without context
contactsRepository.find();
```

---

## 6. Tenant Data Separation

**Schema-per-tenant in PostgreSQL.** Stronger separation than a shared-table `tenant_id` column, simpler to operate than database-per-tenant.

```text
PostgreSQL database: app_db

  core schema (public)
    tenants
    users
    tenant_memberships
    feature_flags
    audit_logs

  tenant_acme schema
    < only tables for modules enabled for Acme >

  tenant_globex schema
    < only tables for modules enabled for Globex >
```

Two tenants can end up with **different tables** in their schema if they have different features enabled — that's expected and is what makes feature toggles meaningful at the data layer, not just the UI layer.

### Provisioning a new tenant

```ts
async provisionTenant(slug: string, enabledFeatures: string[]) {
  const schemaName = toSafeSchemaName(slug);        // sanitize, never trust raw input
  await coreDb.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

  await coreDb.insert(tenants).values({ slug, schemaName, status: 'active' });
  await featureFlagsService.setEnabled(slug, enabledFeatures);

  // Apply only the migrations for enabled modules
  await migrationRunner.applyTenantMigrations(schemaName, enabledFeatures);
}
```

Enabling a feature for an existing tenant later just re-runs that module's migrations against the tenant's schema and flips the flag — no full re-provision needed.

---

## 7. Feature Flags (tenant-specific toggles)

```text
core.feature_flags
  id
  tenant_id
  feature_key        # matches a module's feature.json "key"
  enabled
  enabled_at
  updated_by
```

```ts
@Injectable()
export class FeatureFlagsService {
  async isEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    // Redis-cached, falls back to DB; cache invalidated on toggle
  }

  async setEnabled(tenantId: string, featureKey: string, enabled: boolean) { /* ... */ }
}
```

```ts
@RequireFeature('whatsapp')
@Controller('whatsapp')
export class WhatsappController { /* ... */ }
```

`FeatureFlagGuard` reads the `@RequireFeature()` metadata, checks `tenantContext.enabledFeatures`, and returns 403 if the module isn't enabled for that tenant — before the controller method ever runs. The same check gates BullMQ job processors so disabled features don't silently keep running jobs in the background.

---

## 8. Easy Migrations

Two migration sets, run with one command each:

```text
drizzle/core/      → applied once, to the public/core schema
drizzle/tenant/     → applied to EVERY tenant schema (plus per-module migrations under modules/<feature>/migrations/)
```

```bash
# Apply core schema migrations
pnpm migrate:core

# Apply tenant-schema migrations to every existing tenant (core tenant tables)
pnpm migrate:tenants

# Apply migrations for one module across all tenants that have it enabled
pnpm migrate:module whatsapp

# Provision + migrate a brand-new tenant in one step
pnpm tenant:create --slug=acme --features=whatsapp,billing
```

Migration runner logic, in plain terms:

```text
migrate:tenants
  1. List all tenant schemas from core.tenants
  2. For each tenant:
       For each module the tenant has enabled:
         Run that module's pending migrations against tenant_<slug> schema
       Track applied migrations in tenant_<slug>.__migrations (per-schema, like a normal migration table)
```

Because each module owns its own migration folder and its own per-schema migration log, adding a new module never requires touching another module's migration history, and a tenant only ever runs the migrations for features it actually has.

---

## 9. Cron Jobs / Scheduled Tasks

Two kinds of "scheduled work" show up in a multi-tenant app, and they need different mechanisms:

| Need | Use |
|---|---|
| Simple in-process schedule (e.g. "run every 5 minutes, sweep all tenants") | `@nestjs/schedule`'s `@Cron()` decorator |
| Per-tenant or heavy/long-running scheduled work (e.g. "send tenant's daily report", "sync templates per tenant") | BullMQ **repeatable jobs**, queued per tenant |

`@Cron()` jobs live in the API process and are fine for lightweight, global sweeps. Anything that should survive a server restart, retry on failure, or run once per tenant on a stagger belongs in a BullMQ repeatable job instead — that's what the worker process is for.

### 9.1 Where cron jobs live

Following the module pattern (§4), a module's scheduled tasks live in its own `cron/` folder — never in `core/`. There's also one tiny core piece that fans a global sweep out per tenant:

```text
apps/api/src/core/scheduling/
├── scheduling.module.ts
└── tenant-sweep.service.ts        # iterates active tenants, used by modules that need "for every tenant, do X"

apps/api/src/modules/<feature>/cron/
├── <feature>.cron.ts               # @Cron() definitions or repeatable-job registration
└── <feature>-cron.processor.ts     # BullMQ processor, if queue-backed
```

### 9.2 Module-owned in-process cron

```ts
// modules/whatsapp/cron/template-sync.cron.ts
@Injectable()
export class TemplateSyncCron {
  constructor(
    private tenantSweep: TenantSweepService,
    private featureFlags: FeatureFlagsService,
    private templateSyncQueue: Queue,
  ) {}

  @Cron('0 */6 * * *') // every 6 hours
  async syncAllTenantTemplates() {
    const tenants = await this.tenantSweep.getActiveTenants();
    for (const tenant of tenants) {
      if (!(await this.featureFlags.isEnabled(tenant.id, 'whatsapp'))) continue;
      await this.templateSyncQueue.add('sync-templates', { tenantId: tenant.id });
    }
  }
}
```

This pattern — cron triggers a per-tenant fan-out into the queue, the queue does the actual work — keeps the schedule itself lightweight and lets each tenant's job retry/fail independently.

### 9.3 BullMQ repeatable jobs (queue-backed, preferred for anything tenant-specific)

```ts
// modules/whatsapp/whatsapp.module.ts (on module init / tenant enable)
await campaignQueue.add(
  'check-scheduled-campaigns',
  { tenantId },
  { repeat: { pattern: '*/1 * * * *' }, jobId: `campaign-check:${tenantId}` }, // jobId makes it idempotent per tenant
);
```

Registering the repeatable job with a stable `jobId` keyed by tenant means enabling/disabling the feature for a tenant can cleanly add/remove just that tenant's schedule, without touching anyone else's.

### 9.4 Rules

1. **A cron job is gated by the same `FeatureFlagGuard` logic as everything else** — check the flag before doing tenant-scoped work, even inside a scheduled task.
2. **Global sweeps stay in `core/scheduling/`; tenant-specific logic stays in the owning module's `cron/` folder.** Core never knows what WhatsApp template sync is — it just exposes "give me the active tenants."
3. **Prefer queue-backed repeatable jobs over `@Cron()` for anything tenant-specific or that calls an external API** (e.g. Meta) — retries and backoff come for free.

---

## 10. Code Generation — Skills and Scripts

The module pattern (§4) is deliberately repetitive by design — same files, same shape, every time. That repetition is exactly what's worth automating, the same way the NestJS Backend Skill-Kit approach pairs **Markdown skill files** (what the pattern is and why) with **Node.js generator scripts** (a command that produces it).

### 10.1 `skills/` — written reference for the patterns this repo uses

Each skill is a short Markdown file describing one convention used in this boilerplate: what it is, when to use it, a minimal example, and common mistakes to avoid. These aren't generated code — they're the explanation a generator script (or a person, or an AI assistant working in this repo) should follow.

```text
skills/
├── nestjs-module/SKILL.md          # shape of a feature module (§4)
├── tenant-data-access/SKILL.md     # the TenantContext rule — never query without it
├── cron-jobs/SKILL.md              # when to use @Cron() vs a repeatable job (§9)
├── feature-flags/SKILL.md          # how to gate routes/jobs/cron behind a feature key
└── migrations/SKILL.md             # how module-owned migrations get picked up (§8)
```

### 10.2 `scripts/generators/` — scaffolding commands that follow the skills

Plain Node.js scripts, no framework needed, that read a template and stamp out a new module/entity/cron job in the right place with the right boilerplate already wired up (module registration, `feature.json`, an empty migration file, etc.).

```bash
# Scaffold a brand-new feature module, fully wired (module/controller/service/entities/feature.json)
node scripts/generators/generate-module.js --name=billing

# Add a new Drizzle entity + matching migration inside an existing module
node scripts/generators/generate-entity.js --module=whatsapp --name=campaign

# Add a cron job (in-process or queue-backed) inside an existing module
node scripts/generators/generate-cron-job.js --module=whatsapp --name=template-sync --type=repeatable
```

What `generate-module.js` does, conceptually:

```text
1. Read scripts/generators/_templates/module/*  (the same shape as §4)
2. Replace {{featureName}} / {{FeatureName}} placeholders
3. Write files into apps/api/src/modules/<name>/
4. Create feature.json with defaultEnabled: false
5. Create an empty migrations/0001_init.sql
6. Print the @RequireFeature('<name>') snippet to paste into the controller
```

### 10.3 Why this pairing matters

- The **skill** keeps the convention documented and reviewable on its own — anyone (or any AI coding assistant working in the repo) can read `skills/nestjs-module/SKILL.md` and understand the pattern without reverse-engineering an existing module.
- The **script** keeps the convention enforced — a generated module always has the migration folder, the `feature.json`, and the tenant-context-first service signature, instead of relying on a developer remembering all of §4–§9 by hand each time.
- New modules (`whatsapp`, and whatever comes after it) stay consistent with each other because they were all stamped from the same generator, not hand-copied and drifted.

---

## 11. Frontend Architecture — Micro-Frontends and Common Components (Web + Mobile)

The frontend follows the same "module owns its own slice" idea as the backend (§4), instead of one large app where every feature's code is tangled into shared routers, shared state, and shared bundles — and that idea extends to the mobile app too, not just the web one.

### 11.1 Each web frontend module is a micro-frontend

```text
apps/web/src/modules/<feature>/
├── routes.tsx                     # this module's own routes, lazy-loaded
├── pages/
├── components/                    # feature-specific components (not shared ones)
├── api/                           # this module's own API calls/hooks
├── store/                         # local state for this module only
└── module.config.ts               # { key: "whatsapp", navLabel: "Inbox", icon: ... }
```

The shell app (`apps/web/src/core/`) doesn't import a feature module's internals directly — it reads each module's `module.config.ts`, lazy-loads its `routes.tsx` via `React.lazy()` + dynamic `import()`, and mounts it into the layout. This is "micro-frontend" in the practical sense that matters here: **independent bundles, independent routes, independent state, loaded by the shell at runtime** — without needing a full Module Federation / multi-deployment setup at this stage. (If the product later grows to the point where different modules need to be built and deployed by different teams on different schedules, this same module boundary is what makes upgrading to Vite's Module Federation plugin straightforward — the code is already split that way.)

```ts
// apps/web/src/core/module-loader.ts
const featureModules = [
  { key: 'notes', load: () => import('../modules/notes/routes') },
  { key: 'whatsapp', load: () => import('../modules/whatsapp/routes') },
  // new modules just get added to this list — usually by the generator (§10)
];

export function getEnabledModules(enabledFeatureKeys: Set<string>) {
  return featureModules.filter((m) => enabledFeatureKeys.has(m.key));
}
```

The shell checks `enabledFeatureKeys` (driven by the same tenant feature flags from §7) before even loading a module's bundle — a tenant without `whatsapp` enabled never downloads the Inbox UI's JS at all, not just hides it behind a route guard.

### 11.2 `packages/ui-common` — shared logic, and web-only components

Anything visual that more than one **web** module would otherwise reimplement lives here — buttons, tables, modals, form fields, the tenant switcher, toasts, the empty-state/loading patterns. Feature modules import from it; it never imports from a feature module.

React Native can't render DOM components, so `ui-common`'s `components/` folder is web-only. What *does* cross over to mobile cleanly is everything platform-agnostic: `hooks/` (e.g. `useFeatureFlag`, `useTenant`, `useApi`) and the shared fetch transport (`api/http-client.ts`'s `createHttpClient`, `api/query-string.ts`'s `buildQueryString`). The web theme itself lives as CSS custom properties in `apps/web/src/index.css`, not as a shared token module — there is no cross-platform design-token package here; a mobile theme would define its own values. That's the practical line: **hooks and transport logic are shared, visual components and theme values are not** (unless you later adopt something like `react-native-web`/Tamagui to unify them, which is intentionally out of scope here — see §15).

```ts
// modules/whatsapp/pages/InboxPage.tsx  (web)
import { AdvancedDataTable, Drawer, Button } from '@boilerplate/ui-common';
```

```ts
// modules/whatsapp/screens/InboxScreen.tsx  (mobile)
import { useFeatureFlag, useTenant } from '@boilerplate/ui-common'; // hooks only — no DOM components
```

```ts
// packages/ui-common/src/hooks/useFeatureFlag.ts
export function useFeatureFlag(key: string) {
  const { enabledFeatureKeys } = useTenant();
  return enabledFeatureKeys.has(key);
}
```

### 11.3 Rules that keep this useful instead of becoming clutter

1. **A component goes in `ui-common` only once a second module needs it.** Don't pre-build a shared library speculatively — promote a component out of a feature module the moment a second feature wants the same thing.
2. **`ui-common` has no feature-specific logic.** A `<ConversationBubble>` belongs in `modules/whatsapp/components/`, not `ui-common` — it's domain UI, not a building block.
3. **No module imports another module's `components/` or `store/` directly.** Same boundary rule as the backend (§4): if two modules need to share UI state, that's a sign the shared piece belongs in `ui-common` or in a small cross-module hook in `core/`.
4. **The generator scaffolds the module shape (§10).** `generate-frontend-module.js --name=<feature> --platform=web|mobile|both` creates `routes.tsx`/`screens/`, `module.config.ts`, and the matching folder structure for whichever platform(s) you target, and registers the module in the right `module-loader.ts`.

### 11.4 The mobile app (`apps/mobile`) follows the same module shape

`apps/mobile` is scaffolded with Expo (`npx create-expo-app`) and then layered with the identical module pattern used on web — same idea, mobile-appropriate primitives:

```text
apps/mobile/src/modules/<feature>/
├── screens/                       # this module's own screens (instead of pages/)
├── navigation.ts                  # this module's stack/tab definition, registered with the shell
├── components/                    # feature-specific components (not shared ones)
├── api/                           # this module's own API calls/hooks — usually re-exports the web module's api/ logic
├── store/                         # local state for this module only
└── module.config.ts               # { key: "whatsapp", navLabel: "Inbox", icon: ... } — same shape as web's
```

```ts
// apps/mobile/src/core/module-loader.ts
const featureModules = [
  { key: 'notes', load: () => import('../modules/notes/navigation') },
  { key: 'whatsapp', load: () => import('../modules/whatsapp/navigation') },
];

export function getEnabledModules(enabledFeatureKeys: Set<string>) {
  return featureModules.filter((m) => enabledFeatureKeys.has(m.key));
}
```

Same rule as the web shell: a tenant without a feature enabled never has that module's screens registered with navigation, and ideally never even triggers the dynamic `import()` for it.

**What's shared with web, and what isn't:**

| | Shared with web | Mobile-specific |
|---|---|---|
| API calls / data fetching hooks | Yes — same `api/` logic, same REST endpoints, same `TenantContext` header handling | — |
| `useFeatureFlag`, `useTenant`, and other `ui-common` hooks | Yes | — |
| Visual components | No (DOM vs. native render targets) | `components/` and `screens/` are written per platform |
| Navigation | No | Mobile uses its own `navigation.ts` per module instead of web's `routes.tsx`; both get registered through the same `module.config.ts` shape so the generator and feature-flag gating logic stay identical |

The point isn't "one codebase for both" — it's "one *pattern* for both," so a developer who knows how a web module is built already knows the shape of a mobile module, and the same `skills/frontend-module/SKILL.md` and generator cover both.

---

## 12. Adding the WhatsApp Module (how this boilerplate gets used next)

Once this boilerplate exists, the WhatsApp automation feature is just a new module:

```text
apps/api/src/modules/whatsapp/
├── whatsapp.module.ts
├── whatsapp.controller.ts          # connect number, send message endpoints
├── whatsapp-webhook.controller.ts  # Meta GET verify / POST receive
├── whatsapp.service.ts
├── entities/
│   ├── contacts.ts
│   ├── conversations.ts
│   ├── messages.ts
│   └── templates.ts
├── jobs/
│   ├── inbound-webhook.processor.ts
│   └── outbound-message.processor.ts
├── migrations/
│   └── 0001_init_whatsapp_tables.sql
└── feature.json                    # { "key": "whatsapp", "label": "WhatsApp Automation", "defaultEnabled": false }
```

Nothing under `core/` changes. A tenant that doesn't enable `whatsapp` simply never gets those tables created in their schema and never sees those routes (403 via `FeatureFlagGuard`). This is also where everything from the earlier WhatsApp-specific build guide (Meta webhook registration, signature verification, BullMQ outbound worker, Inbox UI) plugs in directly — it becomes the contents of this one module folder plus its matching `apps/web/src/modules/whatsapp/` frontend folder, and — if you want WhatsApp inbox access from the mobile app — `apps/mobile/src/modules/whatsapp/` built the same way per §11.4.

---

## 13. Local Setup

```yaml
# infra/docker/docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm install
pnpm migrate:core
pnpm tenant:create --slug=demo --features=
pnpm --filter api start:dev
pnpm --filter web dev
pnpm --filter mobile start    # opens Expo Dev Tools — scan the QR with Expo Go, or run an emulator
```

If testing on a physical device via Expo Go, `localhost` in `API_URL` won't reach your dev machine — point the mobile app's API config at your machine's LAN IP (or run `expo start --tunnel`) instead.

---

## 14. Build Order

```text
1. Scaffold apps/api, apps/web, apps/mobile (via standard CLIs: nest new, create-vite,
   create-expo-app), docker compose for postgres+redis
2. Build core/auth + core/tenants + tenant-resolver middleware
3. Build core/feature-flags + FeatureFlagGuard
4. Build the migration runner (core + per-module tenant migrations)
5. Build tenant provisioning command (CREATE SCHEMA + apply enabled modules' migrations)
6. Build core/scheduling/tenant-sweep.service.ts (used by any module's cron fan-out)
7. Build packages/ui-common (hooks/theme shared by web+mobile, components for web) and
   the module-loader in apps/web/src/core/ and apps/mobile/src/core/
8. Write the first skills/*.md files and scripts/generators/generate-module.js +
   generate-frontend-module.js (with --platform=web|mobile|both)
9. Build one trivial module end-to-end using the generators (e.g. "notes") to prove the
   pattern works on both platforms: its own table, migration, feature flag, optional cron
   job, a web module, and a mobile module
10. Add the whatsapp module the same way, via the generators (§12)
11. Add more modules the same way as the product grows
```

---

## 15. What Was Deliberately Left Out (and why)

| Left out | Why |
|---|---|
| GraphQL / metadata-driven object engine | Adds real complexity; this boilerplate optimizes for "add a module," not "let tenants define arbitrary objects at runtime" |
| SDK / CLI app-publishing pipeline | Only useful once you have many tenants wanting fully custom data models — not needed to ship WhatsApp automation |
| ClickHouse / analytics warehouse | Add later, per-module, only if a feature needs heavy analytics |
| GraphQL codegen, Apollo | REST is enough for a single frontend talking to your own backend |
| Full Module Federation / independently deployed micro-frontends | §11's lazy-loaded module pattern gets the main benefit (independent bundles/routes/state) with one build pipeline; only worth the extra deploy complexity once separate teams need to ship separate modules independently |
| Cross-platform UI unification (e.g. React Native Web / Tamagui) | Web and mobile share hooks/transport/types, not rendered components or theme values (§11.2); unifying components is a real option later but adds a build-tooling layer this boilerplate doesn't need on day one |
| EAS Build / app store release pipeline | Expo's local dev flow (`expo start`) is enough to build and test the mobile module pattern; wire up EAS Build/Submit once there's an actual release to ship |

If the product later needs tenant-defined custom fields/objects, that's the point to revisit the metadata-engine approach — but it's not needed to ship a modular, tenant-separated WhatsApp automation product.
