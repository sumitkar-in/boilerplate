# Skill: Feature Flags (Tenant-Specific Toggles)

## What

Every module ships a `feature.json` key. `FeatureFlagGuard` (`apps/api/src/core/feature-flags/feature-flag.guard.ts`) reads the `@RequireFeature()` metadata and checks it against `tenantContext.enabledFeatures`, returning 403 before any of the module's routes run for a tenant that doesn't have it enabled. The same check pattern applies to BullMQ job processors and cron jobs (see skills/cron-jobs/SKILL.md).

On the frontend, the equivalent gate is coarser and happens earlier: `apps/web/src/core/module-loader.ts` / `apps/mobile/src/core/module-loader.ts` only `import()` a module's bundle at all if its key is in the tenant's enabled feature keys — a disabled module's JS is never even downloaded, not just hidden behind a route guard.

## When to use

Every backend module gets this automatically from `generate-module.js` — you rarely write it by hand. Reach for it directly when adding a route to an existing module that should be gated independently, or when checking a flag from inside a cron job / queue processor.

## Minimal example

```ts
@RequireFeature('billing')
@UseGuards(FeatureFlagGuard)
@Controller('billing')
export class BillingController {}
```

Checking a flag programmatically (e.g. inside a cron sweep, where there's no request to gate):

```ts
if (!(await this.featureFlags.isEnabled(tenant.id, 'billing'))) continue;
```

## Common mistakes

- **Adding `@RequireFeature()` without `@UseGuards(FeatureFlagGuard)`.** The decorator only attaches metadata via `SetMetadata` — nothing reads it unless the guard is also applied. The generated controller has both; don't drop the guard when hand-editing or adding a second controller to a module.
- **Checking `FeatureFlagsService.isEnabled()` on every request instead of trusting `tenantContext.enabledFeatures`.** The guard already reads off the resolved `TenantContext`, which is meant to be populated once per request — calling the service directly inside a hot path bypasses that and adds an extra lookup.
- **Forgetting the frontend gate exists independently of the backend one.** Disabling a feature for a tenant on the backend (`FeatureFlagGuard` → 403) doesn't stop the frontend from still trying to lazy-load that module's bundle unless `module-loader.ts`'s `enabledFeatureKeys` is also correct — they're two separate gates that both need the same source of truth (the tenant's enabled feature keys from the API).
- **Assuming `FeatureFlagsService` needs a request in scope.** It reads/writes `core.feature_flags` directly (Redis-cached, 60s TTL) and can be called from anywhere with a `tenantId` — cron sweeps, queue processors, scripts — not just inside request-scoped guards.
