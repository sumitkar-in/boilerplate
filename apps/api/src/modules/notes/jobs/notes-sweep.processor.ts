import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTES_SWEEP_QUEUE, type NotesSweepJobData } from './notes-sweep.types';

/**
 * BullMQ worker processor for the "notes-sweep" queue.
 * Runs background sweep jobs per tenant added by NotesSweepCron.
 * See: skills/cron-jobs/SKILL.md
 */
@Processor(NOTES_SWEEP_QUEUE)
export class NotesSweepProcessor extends WorkerHost {
  private readonly logger = new Logger(NotesSweepProcessor.name);

  process(job: Job<NotesSweepJobData>): Promise<void> {
    const { tenantId } = job.data;
    this.logger.log(
      `Processing notes sweep job ${job.id} for tenant: ${tenantId}`,
    );
    // Future background task work (e.g. archiving old notes or generating summaries) runs here
    return Promise.resolve();
  }
}
