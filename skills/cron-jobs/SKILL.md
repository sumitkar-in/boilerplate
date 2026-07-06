# Skill: Cron Jobs / Scheduled Tasks

## What

Two mechanisms, picked with `--type` on the generator:

- **`--type=cron`** — in-process `@Cron()` (`@nestjs/schedule`) for lightweight global sweeps. Lives in the API process.
- **`--type=repeatable`** — BullMQ repeatable job, queued per tenant with a stable `jobId`, for tenant-specific or external-API-facing work. Runs in the background worker process; retries/backoff come for free.

Global sweeps live in `core/scheduling/` (`TenantSweepService.getActiveTenants()`); tenant-specific logic lives in the owning module's `cron/` folder.

## When to use which

| Need | Use |
|---|---|
| "Run every N minutes, sweep all tenants" | `--type=cron` |
| "Send tenant's daily report", "sync templates per tenant", anything calling an external API (e.g. Meta) | `--type=repeatable` |

## Minimal example

```bash
node scripts/generators/generate-cron-job.js --module=billing --name=invoice-sync
node scripts/generators/generate-cron-job.js --module=billing --name=overdue-check --type=repeatable --pattern="*/1 * * * *"
```

Both register the generated provider(s) into the owning module's `<module>.module.ts` automatically — find the `// cron providers are registered below this line` marker if you need to hand-edit. The in-process pattern (from `apps/api/src/core/scheduling/`):

```ts
@Cron('0 */6 * * *')
async syncAllTenantInvoices() {
  const tenants = await this.tenantSweep.getActiveTenants();
  for (const tenant of tenants) {
    if (!(await this.featureFlags.isEnabled(tenant.id, 'billing'))) continue;
    await this.invoiceSyncQueue.add('sync-invoices', { tenantId: tenant.id });
  }
}
```

## Common mistakes

- **Doing the actual tenant work inside the `@Cron()` handler instead of fanning it into a queue.** The sweep should stay lightweight — find the tenants, enqueue the work, let the queue (or a repeatable job) handle retries per tenant independently.
- **Forgetting the `jobId` on a repeatable job.** Without a stable `jobId` keyed by tenant (`` `${jobKey}:${tenant.id}` `` — the generated template already does this), re-registering on every boot creates duplicate schedules instead of upserting the same one.
- **Skipping the feature-flag check inside the job.** A cron job is gated by the same logic as a route — check `featureFlags.isEnabled(tenant.id, '<key>')` before doing tenant-scoped work, even inside a scheduled task. The generated templates already do this; don't remove it when hand-editing.
- **Relying on `--type=repeatable` before Redis is wired up.** The generated `@InjectQueue()` code compiles, but nothing will actually run until a `BullModule` connection (reading `REDIS_URL`) is registered — see the `TODO` left in the generated `*.cron.ts` file.
- **Putting tenant-specific logic in `core/scheduling/`.** That folder only knows "give me the active tenants" — it has no idea what billing invoice sync is. Tenant-specific cron logic belongs in the owning module's `cron/` folder.
