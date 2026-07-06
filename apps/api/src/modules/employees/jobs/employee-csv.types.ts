import type { QueryEmployeesDto } from '../dto/query-employees.dto';

export const EMPLOYEE_CSV_QUEUE = 'employee-csv';

// The slice of TenantContext a queued job can carry (JSON-serializable) —
// enough for TenantDbService scoping and storage pathing.
export type CsvJobTenant = {
  tenantId: string;
  tenantSlug: string;
  schemaName: string;
};

export type EmployeeCsvExportJobData = {
  tenant: CsvJobTenant;
  query: Partial<QueryEmployeesDto>;
};

export type EmployeeCsvImportJobData = {
  tenant: CsvJobTenant;
  csv: string;
};

export type EmployeeCsvJobData =
  EmployeeCsvExportJobData | EmployeeCsvImportJobData;

export type EmployeeCsvExportResult = {
  // Storage key only — the file is fetched through the authenticated
  // GET jobs/:jobId/download route, never via a public URL. The local
  // storage driver's URL is a permanent, unauthenticated path, so it must
  // never be handed to clients directly.
  key: string;
  fileName: string;
  rowCount: number;
};

export type EmployeeCsvImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  // Row-level problems (skips and warnings), capped to keep results small.
  errors: Array<{ line: number; message: string }>;
};
