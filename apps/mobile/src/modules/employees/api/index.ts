import { apiFetch } from '../../../core/api-client';

export type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeInput = {
  name: string;
  phone: string;
  email: string;
};

export function listEmployees(): Promise<Employee[]> {
  return apiFetch<Employee[]>('/employees');
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
