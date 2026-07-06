import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { parseCsv, toCsv } from '../../../core/common/csv';
import { TenantDbService } from '../../../core/database/tenant-db.service';
import { StorageService } from '../../../core/storage/storage.service';
import type { TenantContext } from '../../../core/tenants/tenant-context';
import { DepartmentsService } from '../../departments/departments.service';
import { EmployeeCustomFieldsService } from '../employee-custom-fields.service';
import { EmployeesService } from '../employees.service';
import { employee } from '../entities/employee';
import {
  EMPLOYEE_CSV_QUEUE,
  type CsvJobTenant,
  type EmployeeCsvExportJobData,
  type EmployeeCsvExportResult,
  type EmployeeCsvImportJobData,
  type EmployeeCsvImportResult,
} from './employee-csv.types';

const EXPORT_PAGE_SIZE = 1000;
const MAX_REPORTED_ERRORS = 50;

/**
 * Consumer side of the employee CSV pipeline. Runs in the dedicated worker
 * process (worker.main.ts / the docker "worker" service) — it is
 * deliberately NOT registered in EmployeesModule, so the API process never
 * competes for these jobs.
 */
@Processor(EMPLOYEE_CSV_QUEUE, { concurrency: 2 })
export class EmployeeCsvProcessor extends WorkerHost {
  private readonly logger = new Logger(EmployeeCsvProcessor.name);

  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly employeesService: EmployeesService,
    private readonly customFieldsService: EmployeeCustomFieldsService,
    private readonly departmentsService: DepartmentsService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<EmployeeCsvExportResult | EmployeeCsvImportResult> {
    this.logger.log(
      `Processing ${job.name} job ${job.id} for tenant ${(job.data as { tenant: CsvJobTenant }).tenant.tenantSlug}`,
    );
    if (job.name === 'export')
      return this.handleExport(job as Job<EmployeeCsvExportJobData>);
    if (job.name === 'import')
      return this.handleImport(job as Job<EmployeeCsvImportJobData>);
    throw new Error(`Unknown job "${job.name}" on ${EMPLOYEE_CSV_QUEUE}`);
  }

  // Job payloads carry the JSON-safe tenant slice; the services only read
  // schemaName/tenantId from the context.
  private asTenantContext(tenant: CsvJobTenant): TenantContext {
    return tenant as unknown as TenantContext;
  }

  private async listDepartmentsSafe(tenant: TenantContext) {
    try {
      const result = await this.departmentsService.findAll(tenant, {
        limit: 500,
        offset: 0,
      });
      return result.rows;
    } catch {
      // Tenant may not have the departments module migrated/enabled.
      return [];
    }
  }

  private async handleExport(
    job: Job<EmployeeCsvExportJobData>,
  ): Promise<EmployeeCsvExportResult> {
    const tenant = this.asTenantContext(job.data.tenant);
    const query = job.data.query ?? {};
    const [customFields, departments, employeesPage] = await Promise.all([
      this.customFieldsService.findAll(tenant),
      this.listDepartmentsSafe(tenant),
      this.employeesService.findAll(tenant, { limit: 10000 }),
    ]);
    const departmentNames = new Map(
      departments.map((row) => [row.id, row.name]),
    );
    const employeeNames = new Map(
      employeesPage.rows.map((row) => [row.id, row.name]),
    );

    const rows: string[][] = [
      [
        'Name',
        'Phone',
        'Email',
        'Department',
        'Manager',
        ...customFields.map((field) => field.label),
        'Created At',
      ],
    ];
    for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
      const page = await this.employeesService.findAll(tenant, {
        ...query,
        limit: EXPORT_PAGE_SIZE,
        offset,
      });
      for (const row of page.rows) {
        rows.push([
          row.name,
          row.phone,
          row.email,
          row.departmentId ? (departmentNames.get(row.departmentId) ?? '') : '',
          row.managerId ? (employeeNames.get(row.managerId) ?? '') : '',
          ...customFields.map(
            (field) => row.customFields?.[field.fieldKey] ?? '',
          ),
          row.createdAt.toISOString(),
        ]);
      }
      await job.updateProgress(
        Math.min(
          99,
          Math.round(((rows.length - 1) / Math.max(1, page.total)) * 100),
        ),
      );
      if (page.rows.length < EXPORT_PAGE_SIZE) break;
    }

    const fileName = `employees-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    const uploaded = await this.storage.uploadFile({
      tenantId: job.data.tenant.tenantId,
      path: `exports/${fileName}`,
      content: Buffer.from(`\uFEFF${toCsv(rows)}`, 'utf8'),
      contentType: 'text/csv',
    });
    await job.updateProgress(100);
    return {
      key: uploaded.key,
      fileName,
      rowCount: rows.length - 1,
    };
  }

  private async handleImport(
    job: Job<EmployeeCsvImportJobData>,
  ): Promise<EmployeeCsvImportResult> {
    const tenant = this.asTenantContext(job.data.tenant);
    const parsed = parseCsv(job.data.csv);
    if (parsed.length < 2)
      throw new Error(
        'CSV must contain a header row and at least one data row',
      );

    const [customFields, departments, employeesPage] = await Promise.all([
      this.customFieldsService.findAll(tenant),
      this.listDepartmentsSafe(tenant),
      this.employeesService.findAll(tenant, { limit: 10000 }),
    ]);
    const departmentIdsByName = new Map(
      departments.map((row) => [row.name.trim().toLowerCase(), row.id]),
    );
    const employeeIdsByName = new Map(
      employeesPage.rows.map((row) => [row.name.trim().toLowerCase(), row.id]),
    );

    // Header cells map to built-in columns by name and to custom fields by
    // label or field key (all case-insensitive). Unrecognized columns are
    // ignored.
    const header = parsed[0].map((cell) => cell.trim().toLowerCase());
    const builtinIndex = {
      name: header.indexOf('name'),
      phone: header.indexOf('phone'),
      email: header.indexOf('email'),
      department: header.indexOf('department'),
      manager: header.indexOf('manager'),
    };
    if (
      builtinIndex.name < 0 ||
      builtinIndex.phone < 0 ||
      builtinIndex.email < 0
    ) {
      throw new Error(
        'CSV header must include "Name", "Phone", and "Email" columns',
      );
    }
    const customIndex = customFields
      .map((field) => ({
        fieldKey: field.fieldKey,
        index: header.findIndex(
          (cell) =>
            cell === field.label.trim().toLowerCase() ||
            cell === field.fieldKey,
        ),
      }))
      .filter((entry) => entry.index >= 0);

    const summary: EmployeeCsvImportResult = {
      total: parsed.length - 1,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    const recordError = (line: number, message: string) => {
      if (summary.errors.length < MAX_REPORTED_ERRORS)
        summary.errors.push({ line, message });
    };

    await this.tenantDb.withTenantDb(tenant, async (db) => {
      const existing = await db
        .select({ id: employee.id, email: employee.email })
        .from(employee);
      const idsByEmail = new Map(
        existing.map((row) => [row.email.trim().toLowerCase(), row.id]),
      );

      for (let i = 1; i < parsed.length; i += 1) {
        const cells = parsed[i];
        const line = i + 1;
        const name = (cells[builtinIndex.name] ?? '').trim();
        const phone = (cells[builtinIndex.phone] ?? '').trim();
        const email = (cells[builtinIndex.email] ?? '').trim();
        if (!name || !phone || !email) {
          summary.skipped += 1;
          recordError(line, 'Missing required name, phone, or email');
          continue;
        }

        let departmentId: string | null = null;
        const departmentName =
          builtinIndex.department >= 0
            ? (cells[builtinIndex.department] ?? '').trim()
            : '';
        if (departmentName) {
          departmentId =
            departmentIdsByName.get(departmentName.toLowerCase()) ?? null;
          if (!departmentId)
            recordError(
              line,
              `Unknown department "${departmentName}" — left unassigned`,
            );
        }

        let managerId: string | null = null;
        const managerName =
          builtinIndex.manager >= 0
            ? (cells[builtinIndex.manager] ?? '').trim()
            : '';
        if (managerName) {
          managerId = employeeIdsByName.get(managerName.toLowerCase()) ?? null;
          if (!managerId)
            recordError(
              line,
              `Unknown manager "${managerName}" — left unassigned`,
            );
        }

        const customValues = Object.fromEntries(
          customIndex.map((entry) => [
            entry.fieldKey,
            (cells[entry.index] ?? '').trim(),
          ]),
        );

        try {
          const existingId = idsByEmail.get(email.toLowerCase());
          if (existingId) {
            await db
              .update(employee)
              .set({
                name,
                phone,
                email,
                departmentId,
                managerId,
                customFields: customValues,
                updatedAt: new Date(),
              })
              .where(eq(employee.id, existingId));
            summary.updated += 1;
          } else {
            const [created] = await db
              .insert(employee)
              .values({
                name,
                phone,
                email,
                departmentId,
                managerId,
                customFields: customValues,
              })
              .returning({ id: employee.id });
            idsByEmail.set(email.toLowerCase(), created.id);
            summary.created += 1;
          }
        } catch (err) {
          summary.skipped += 1;
          recordError(
            line,
            err instanceof Error ? err.message : 'Failed to save row',
          );
        }

        if (i % 25 === 0)
          await job.updateProgress(Math.round((i / (parsed.length - 1)) * 100));
      }
    });

    await job.updateProgress(100);
    return summary;
  }
}
