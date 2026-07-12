import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type Visitor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  entryTime: string;
  exitTime?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisitorInput = {
  name: string;
  email: string;
  phone: string;
  entryTime: string;
  exitTime?: string | null;
};

export type VisitorListParams = {
  search?: string;
  filters?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type VisitorListResult = {
  rows: Visitor[];
  total: number;
  limit: number;
  offset: number;
};

export function listVisitors(params: VisitorListParams = {}): Promise<VisitorListResult> {
  return apiFetch<VisitorListResult>(`/visitors${buildQueryString(params)}`);
}

export function createVisitor(input: VisitorInput): Promise<Visitor> {
  return apiFetch<Visitor>('/visitors', { method: 'POST', body: input });
}

export function updateVisitor(id: string, input: Partial<VisitorInput>): Promise<Visitor> {
  return apiFetch<Visitor>(`/visitors/${id}`, { method: 'PATCH', body: input });
}

export function deleteVisitor(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/visitors/${id}`, { method: 'DELETE' });
}
