import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TenantSweepService } from '../../../core/scheduling/tenant-sweep.service';
import { FeatureFlagsService } from '../../../core/feature-flags/feature-flags.service';

/**
 * Registers a BullMQ repeatable job per active tenant that has
 * "{{moduleKey}}" enabled — preferred over @Cron() for anything
 * tenant-specific or that calls an external API, since retries/backoff
 * come for free. The stable jobId keyed by tenant makes this idempotent,
 * so re-running registration is always safe.
 *
 * TODO: register the BullMQ Redis connection (e.g. BullModule.forRootAsync
 * reading REDIS_URL) in a queue module once that wiring exists — without
 * it, @InjectQueue('{{jobKey}}') has nothing to inject at runtime. Also
 * re-run this registration when a tenant enables/disables "{{moduleKey}}",
 * not only on boot. See: skills/cron-jobs/SKILL.md
 */
@Injectable()
export class {{JobName}}Cron implements OnModuleInit {
  constructor(
    @InjectQueue('{{jobKey}}') private readonly {{jobName}}Queue: Queue,
    private readonly tenantSweep: TenantSweepService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async onModuleInit() {
    const tenants = await this.tenantSweep.getActiveTenants();
    for (const tenant of tenants) {
      if (!(await this.featureFlags.isEnabled(tenant.id, '{{moduleKey}}'))) continue;
      await this.{{jobName}}Queue.add(
        '{{jobKey}}',
        { tenantId: tenant.id },
        { repeat: { pattern: '{{cronPattern}}' }, jobId: `{{jobKey}}-${tenant.id}` },
      );
    }
  }
}
