import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type NoteStatus = 'active' | 'archived' | 'trashed';

export type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  status: NoteStatus;
  color: string | null;
  labels: string[];
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = {
  title: string;
  content: string;
  pinned?: boolean;
  status?: NoteStatus;
  color?: string;
  labels?: string[];
  reminderAt?: string | null;
};

export type NoteListResponse = {
  rows: Note[];
  total: number;
  limit: number;
  offset: number;
};

export type NoteListParams = {
  search?: string;
  status?: NoteStatus;
  label?: string;
  pinned?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export function listNotes(params: NoteListParams = {}): Promise<NoteListResponse> {
  return apiFetch<NoteListResponse>(`/notes${buildQueryString(params)}`);
}

export function createNote(input: NoteInput): Promise<Note> {
  return apiFetch<Note>('/notes', { method: 'POST', body: input });
}

export function updateNote(id: string, input: Partial<NoteInput>): Promise<Note> {
  return apiFetch<Note>(`/notes/${id}`, { method: 'PATCH', body: input });
}

export function deleteNote(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/notes/${id}`, { method: 'DELETE' });
}
