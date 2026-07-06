import { buildQueryString } from '@boilerplate/ui-common';
import { apiDownload, apiFetch } from '../../../core/api-client';

export type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  departmentId: string | null;
  managerId: string | null;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeInput = {
  name: string;
  phone: string;
  email: string;
  departmentId?: string | null;
  managerId?: string | null;
  customFields?: Record<string, string>;
};

export type EmployeeListParams = {
  search?: string;
  departmentId?: string;
  // JSON-encoded ListFilter[] — see toListFilters()/encodeListFilters() in @boilerplate/ui-common.
  filters?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type EmployeeListResult = {
  rows: Employee[];
  total: number;
  limit: number;
  offset: number;
};

export type EmployeeCustomFieldType = 'text' | 'number' | 'date' | 'select';

export type EmployeeCustomField = {
  id: string;
  fieldKey: string;
  label: string;
  type: EmployeeCustomFieldType;
  options: string[];
  createdAt: string;
  updatedAt: string;
};

export type EmployeeCustomFieldInput = {
  label: string;
  type?: EmployeeCustomFieldType;
  options?: string[];
};

export function listEmployees(params: EmployeeListParams = {}): Promise<EmployeeListResult> {
  return apiFetch<EmployeeListResult>(`/employees${buildQueryString(params)}`);
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return apiFetch<Employee>('/employees', { method: 'POST', body: input });
}

export function updateEmployee(id: string, input: Partial<EmployeeInput>): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}`, { method: 'PATCH', body: input });
}

export function deleteEmployee(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/employees/${id}`, { method: 'DELETE' });
}

export function listCustomFields(): Promise<EmployeeCustomField[]> {
  return apiFetch<EmployeeCustomField[]>('/employees/custom-fields');
}

export function createCustomField(input: EmployeeCustomFieldInput): Promise<EmployeeCustomField> {
  return apiFetch<EmployeeCustomField>('/employees/custom-fields', { method: 'POST', body: input });
}

export function updateCustomField(
  id: string,
  input: Partial<EmployeeCustomFieldInput>,
): Promise<EmployeeCustomField> {
  return apiFetch<EmployeeCustomField>(`/employees/custom-fields/${id}`, { method: 'PATCH', body: input });
}

export function deleteCustomField(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/employees/custom-fields/${id}`, { method: 'DELETE' });
}

// --- async CSV jobs, processed by the worker service ---

export type EmployeeCsvJobState = 'waiting' | 'delayed' | 'active' | 'completed' | 'failed' | string;

export type EmployeeCsvJobStatus = {
  jobId: string;
  type: 'export' | 'import';
  state: EmployeeCsvJobState;
  progress: number;
  result: unknown;
  error: string | null;
};

export type EmployeeImportSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ line: number; message: string }>;
};

export function startEmployeeExport(
  params: Pick<EmployeeListParams, 'search' | 'departmentId' | 'filters' | 'sortBy' | 'sortDir'> = {},
): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>('/employees/export', {
    method: 'POST',
    body: { ...params, filters: params.filters?.length ? JSON.stringify(params.filters) : undefined },
  });
}

export function startEmployeeImport(csv: string): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>('/employees/import', { method: 'POST', body: { csv } });
}

export function getEmployeeCsvJob(jobId: string): Promise<EmployeeCsvJobStatus> {
  return apiFetch<EmployeeCsvJobStatus>(`/employees/jobs/${jobId}`);
}

export function downloadEmployeeExport(jobId: string): Promise<Blob> {
  return apiDownload(`/employees/jobs/${jobId}/download`);
}

/** Polls a CSV job until it settles; throws on failure or timeout. */
export async function waitForEmployeeCsvJob(
  jobId: string,
  { intervalMs = 1000, timeoutMs = 120_000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<EmployeeCsvJobStatus> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const status = await getEmployeeCsvJob(jobId);
    if (status.state === 'completed') return status;
    if (status.state === 'failed') throw new Error(status.error ?? 'Job failed');
    if (Date.now() > deadline) throw new Error('Timed out waiting for the job to finish');
    await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs));
  }
}
