# Skill: Module-Owned Migrations

## What

`drizzle/core/` holds core schema migrations (applied once, to the public/core schema). Each feature module owns its own `migrations/` folder, applied to every tenant schema that has that module enabled. Each tenant schema tracks its own applied-migrations log (`tenant_<slug>.__migrations`), so adding a new module never touches another module's migration history.

## When to use

Whenever a module's `entities/` changes — every entity must have a matching, numbered migration file in the same module's `migrations/` folder.

## Minimal example

```bash
node scripts/generators/generate-entity.js --module=billing --name=invoice
```

This writes both `entities/invoice.ts` (the Drizzle table) and the next-numbered `migrations/000N_add_invoice.sql` in one step — the generator scans the module's `migrations/` folder and increments past the highest existing number automatically, so two developers adding entities to the same module on different branches don't collide.

```bash
pnpm migrate:core                                       # apply drizzle/core/*.sql to the public schema
pnpm migrate:tenants                                     # apply drizzle/tenant/*.sql + each tenant's enabled modules' migrations, for every tenant
pnpm migrate:module billing                              # apply modules/billing/migrations/*.sql only to tenants with "billing" enabled
pnpm tenant:create --slug=acme --features=notes,employees  # provision a schema, set flags, apply drizzle/tenant + the given modules' migrations
```

All four are fully implemented (`scripts/database/migrate-core.js`, `migrate-tenants.js`, `migrate-module.js`, `create-tenant.js`, sharing `lib/migration-runner.js`) — they connect to the real `DATABASE_URL`, apply `.sql` files per schema, and track applied migrations in that schema's own `__migrations` table.

## Common mistakes

- **Editing a migration that's already been applied to a tenant.** Migrations are append-only — add a new numbered file instead of changing an old one, the same way you wouldn't rewrite git history other people have pulled.
- **Letting `entities/<name>.ts` and its migration drift apart.** The Drizzle table definition and the raw SQL must describe the same columns — the generator scaffolds both together for exactly this reason; keep editing them as a pair.
- **Hand-numbering migration files instead of using the generator.** Two developers picking the same next number on different branches is exactly the collision `generate-entity.js`'s auto-incrementing avoids — let it pick the number.
- **Forgetting these hit the real configured `DATABASE_URL`.** There's no dry-run flag — double-check `.env` before running any `migrate:*`/`tenant:create` command against anything other than local dev.
