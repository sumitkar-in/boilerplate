import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

/**
 * BullMQ worker for the "{{jobKey}}" queue — runs in the background
 * worker process, processing jobs added by {{JobName}}Cron.
 * See: skills/cron-jobs/SKILL.md
 */
@Processor('{{jobKey}}')
export class {{JobName}}CronProcessor extends WorkerHost {
  async process(job: Job<{ tenantId: string }>): Promise<void> {
    // TODO: do {{moduleKey}}'s per-tenant work for job.data.tenantId
  }
}
