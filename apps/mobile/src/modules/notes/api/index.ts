import { apiFetch } from '../../../core/api-client';

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = {
  title: string;
  content: string;
};

export function listNotes(): Promise<Note[]> {
  return apiFetch<Note[]>('/notes');
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
