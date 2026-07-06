import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TenantSweepService } from '../../../core/scheduling/tenant-sweep.service';
import { FeatureFlagsService } from '../../../core/feature-flags/feature-flags.service';

/**
 * In-process cron sweep for the {{moduleKey}} module. Runs in the API
 * process — fine for lightweight, global work. Anything tenant-specific,
 * long-running, or calling an external API belongs in a queue-backed
 * repeatable job instead:
 *   node scripts/generators/generate-cron-job.js --module={{moduleKey}} --name=<job> --type=repeatable
 * See: skills/cron-jobs/SKILL.md
 */
@Injectable()
export class {{JobName}}Cron {
  constructor(
    private readonly tenantSweep: TenantSweepService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Cron('{{cronPattern}}')
  async {{jobName}}() {
    const tenants = await this.tenantSweep.getActiveTenants();
    for (const tenant of tenants) {
      if (!(await this.featureFlags.isEnabled(tenant.id, '{{moduleKey}}'))) continue;
      // TODO: do this tenant's work, e.g. fan out into a queue:
      // await this.{{jobName}}Queue.add('{{jobKey}}', { tenantId: tenant.id });
    }
  }
}
