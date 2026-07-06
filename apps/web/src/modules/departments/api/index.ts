import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type Department = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DepartmentInput = {
  name: string;
  description?: string;
};

export type DepartmentListParams = {
  search?: string;
  filters?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type DepartmentListResult = {
  rows: Department[];
  total: number;
  limit: number;
  offset: number;
};

export function listDepartments(params: DepartmentListParams = {}): Promise<DepartmentListResult> {
  return apiFetch<DepartmentListResult>(`/departments${buildQueryString(params)}`);
}

export function createDepartment(input: DepartmentInput): Promise<Department> {
  return apiFetch<Department>('/departments', { method: 'POST', body: input });
}

export function updateDepartment(id: string, input: Partial<DepartmentInput>): Promise<Department> {
  return apiFetch<Department>(`/departments/${id}`, { method: 'PATCH', body: input });
}

export function deleteDepartment(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/departments/${id}`, { method: 'DELETE' });
}
