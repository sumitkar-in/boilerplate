import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TenantSweepService } from '../../../core/scheduling/tenant-sweep.service';
import { FeatureFlagsService } from '../../../core/feature-flags/feature-flags.service';
import { NOTES_SWEEP_JOB, NOTES_SWEEP_QUEUE } from '../jobs/notes-sweep.types';

/**
 * In-process cron sweep for the notes module. Runs in the API
 * process — fine for lightweight, global work. Anything tenant-specific,
 * long-running, or calling an external API belongs in a queue-backed
 * repeatable job instead:
 *   node scripts/generators/generate-cron-job.js --module=notes --name=<job> --type=repeatable
 * See: skills/cron-jobs/SKILL.md
 */
@Injectable()
export class NotesSweepCron {
  constructor(
    @InjectQueue(NOTES_SWEEP_QUEUE) private readonly notesSweepQueue: Queue,
    private readonly tenantSweep: TenantSweepService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Cron('0 */6 * * *')
  async notesSweep() {
    const tenants = await this.tenantSweep.getActiveTenants();
    for (const tenant of tenants) {
      if (!(await this.featureFlags.isEnabled(tenant.id, 'notes'))) continue;
      await this.notesSweepQueue.add(
        NOTES_SWEEP_JOB,
        { tenantId: tenant.id },
        { jobId: `${NOTES_SWEEP_JOB}-${tenant.id}-${Date.now()}` },
      );
    }
  }
}
