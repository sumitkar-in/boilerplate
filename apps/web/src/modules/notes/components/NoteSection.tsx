import type { Note } from '../api';
import { NoteCard } from './NoteCard';
import type { NotePatch, ViewMode } from './types';

export function NoteSection({
  title,
  notes,
  viewMode,
  onPatchNote,
  onEdit,
  onTrash,
  onDelete,
  onDuplicate,
  onCopy,
}: {
  title: string;
  notes: Note[];
  viewMode: ViewMode;
  onPatchNote: (id: string, patch: NotePatch) => void;
  onEdit: (note: Note) => void;
  onTrash: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (note: Note) => void;
  onCopy: (note: Note) => void;
}) {
  if (notes.length === 0) return null;
  return (
    <section className="notes-section" aria-label={title}>
      <h2>{title}</h2>
      <div className={`notes-card-board notes-card-board--${viewMode}`}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onPatchNote={onPatchNote}
            onEdit={onEdit}
            onTrash={onTrash}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onCopy={onCopy}
          />
        ))}
      </div>
    </section>
  );
}
