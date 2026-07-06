# Skill: NestJS Feature Module Shape

## What

Every backend feature lives in `apps/api/src/modules/<feature>/` with the same shape:

```text
apps/api/src/modules/<feature>/
├── <feature>.module.ts      — registers controller + service, exports the service
├── <feature>.controller.ts  — @TenantModuleController already wires feature-flag gating,
│                              permissions guards, and Swagger auth annotations
├── <feature>.service.ts     — TenantContext-first method signatures
├── dto/
├── entities/                — Drizzle table definitions owned by this module
├── jobs/                    — BullMQ processors, if needed
├── cron/                    — scheduled tasks (see skills/cron-jobs/SKILL.md)
├── migrations/               — module-owned migration files (tenant schema)
└── feature.json              — { key, label, defaultEnabled: false }
```

## When to use

Any new domain/feature added to the boilerplate — e.g. the `notes` and `employees` modules shipped as reference implementations of this pattern.

## Minimal example

```bash
node scripts/generators/generate-module.js --name=billing
```

This writes the full folder shape above and registers `BillingModule` in `apps/api/src/app.module.ts` automatically (look for the `// feature modules are registered below this line` marker — that's where the generator inserts new imports/entries; don't remove it). Add data with:

```bash
node scripts/generators/generate-entity.js --module=billing --name=invoice
```

## Rules that keep this extendable

0. **Never read `process.env` in a module.** All env access lives in `apps/api/src/core/config/` — declare new variables in `env.validation.ts`, expose them through a namespaced `registerAs` config (or add a new one), and constructor-inject it: `@Inject(authConfig.KEY) private readonly auth: AuthConfig`. Document the variable in `.env.example`.
1. **Shared master data lives in `@boilerplate/contracts`.** Role keys, default role permissions, menu keys, storage keys, session types, and module config/API envelope types belong there — don't duplicate string literal arrays in API, web, or mobile code.
2. **A module only touches its own tables.** No module imports another module's `entities/` directly — cross-feature data access goes through the other module's exported service.
3. **A module declares its own migrations.** The generator picks up `migrations/` automatically per module — there's no central migration file to edit (see skills/migrations/SKILL.md).
4. **A module is toggleable.** `feature.json`'s key + `@RequireFeature()` + `FeatureFlagGuard` gate every route (see skills/feature-flags/SKILL.md).
5. **A module can be deleted.** Since nothing outside it references its tables directly, removing a module folder (and its tables) doesn't break other features.

## Common mistakes

- **Re-running `generate-module.js` to "fix" a module.** It refuses to overwrite an existing module directory by design — edit the files directly instead.
- **Using the old decorator stack instead of `@TenantModuleController`.** Always use `@TenantModuleController('featureKey')` instead of manually stacking `@ApiTags`, `@ApiBearerAuth`, `@RequireFeature`, and `@UseGuards(FeatureFlagGuard, PermissionsGuard)`.
- **Catching Postgres unique violations (error code 23505) in the service.** Let the error propagate — `PostgresExceptionFilter` converts it to HTTP 409 globally.
- **Throwing `NotFoundException` manually instead of using `assertFound()`.** Use `assertFound(row, 'EntityName')` from `crud.helpers` so not-found errors are consistent.
- **Manually building list queries instead of using `listAndCount()`.** Use `listAndCount(db, table, query, config, extraConditions?)` inside `withTenantDb()` for all list/search endpoints.
- **Registering queue processors in API modules.** Feature modules can register cron/queue producers, but processors that consume BullMQ jobs belong in `WorkerModule`.
- **Importing `entities/campaign.ts` from another module's service.** Even read-only access should go through the owning module's exported service (`BillingService`, not `billingEntities.invoice`) so the table can change shape without breaking unrelated modules.
- **Manually adding the module to `app.module.ts` after also running the generator.** The generator already does this — check for a duplicate import/array entry before hand-editing.
