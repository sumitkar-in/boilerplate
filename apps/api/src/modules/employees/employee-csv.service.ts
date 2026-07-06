import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StorageService } from '../../core/storage/storage.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import type { QueryEmployeesDto } from './dto/query-employees.dto';
import {
  EMPLOYEE_CSV_QUEUE,
  type CsvJobTenant,
  type EmployeeCsvExportResult,
  type EmployeeCsvJobData,
} from './jobs/employee-csv.types';

// Keep finished jobs around long enough to poll status and download the
// export, then let BullMQ garbage-collect them.
const JOB_RETENTION = { age: 24 * 60 * 60 };

/**
 * Producer side of the employee CSV pipeline: enqueues export/import jobs
 * and reports their status. The heavy lifting happens in
 * jobs/employee-csv.processor.ts, which runs in the dedicated worker
 * process (apps/api/src/worker.main.ts), not in the API.
 */
@Injectable()
export class EmployeeCsvService {
  constructor(
    @InjectQueue(EMPLOYEE_CSV_QUEUE)
    private readonly queue: Queue<EmployeeCsvJobData>,
    private readonly storage: StorageService,
  ) {}

  private toJobTenant(tenant: TenantContext): CsvJobTenant {
    return {
      tenantId: tenant.tenantId,
      tenantSlug: tenant.tenantSlug,
      schemaName: tenant.schemaName,
    };
  }

  async enqueueExport(
    tenant: TenantContext,
    query: Partial<QueryEmployeesDto>,
  ) {
    const job = await this.queue.add(
      'export',
      { tenant: this.toJobTenant(tenant), query },
      { removeOnComplete: JOB_RETENTION, removeOnFail: JOB_RETENTION },
    );
    return { jobId: String(job.id) };
  }

  async enqueueImport(tenant: TenantContext, csv: string) {
    const job = await this.queue.add(
      'import',
      { tenant: this.toJobTenant(tenant), csv },
      { removeOnComplete: JOB_RETENTION, removeOnFail: JOB_RETENTION },
    );
    return { jobId: String(job.id) };
  }

  private async getOwnedJob(tenant: TenantContext, jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data.tenant.tenantId !== tenant.tenantId) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async getStatus(tenant: TenantContext, jobId: string) {
    const job = await this.getOwnedJob(tenant, jobId);
    const state = await job.getState();
    return {
      jobId: String(job.id),
      type: job.name as 'export' | 'import',
      state,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: (job.returnvalue as unknown) ?? null,
      error: job.failedReason ?? null,
    };
  }

  async getExportDownload(tenant: TenantContext, jobId: string) {
    const job = await this.getOwnedJob(tenant, jobId);
    if (job.name !== 'export')
      throw new BadRequestException('Not an export job');
    if ((await job.getState()) !== 'completed') {
      throw new BadRequestException('Export is not finished yet');
    }
    const result = job.returnvalue as EmployeeCsvExportResult;
    const { buffer } = await this.storage.getFileBuffer(result.key);
    return { buffer, fileName: result.fileName };
  }
}
