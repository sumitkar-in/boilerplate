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

export function listVisitors(): Promise<Visitor[]> {
  return apiFetch<{ rows: Visitor[] }>('/visitors').then(res => res.rows);
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
