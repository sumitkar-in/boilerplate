import type { NoteInput, NoteStatus } from '../api';

export type ViewMode = 'grid' | 'list';
export type NoteColor = 'default' | 'lemon' | 'mint' | 'sky' | 'rose' | 'lavender';
export type NoteFilter = NoteStatus | 'all';
export type NotePatch = Partial<Pick<NoteInput, 'pinned' | 'status' | 'color' | 'labels' | 'reminderAt'>>;

export const NOTE_COLORS: Array<{ key: NoteColor; label: string }> = [
  { key: 'default', label: 'Default' },
  { key: 'lemon', label: 'Lemon' },
  { key: 'mint', label: 'Mint' },
  { key: 'sky', label: 'Sky' },
  { key: 'rose', label: 'Rose' },
  { key: 'lavender', label: 'Lavender' },
];
