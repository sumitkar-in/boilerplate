import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  Copy,
  Edit2,
  Palette,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { Note } from '../api';
import { NOTE_COLORS, type NotePatch } from './types';

export function NoteCard({
  note,
  onPatchNote,
  onEdit,
  onTrash,
  onDelete,
  onDuplicate,
  onCopy,
}: {
  note: Note;
  onPatchNote: (id: string, patch: NotePatch) => void;
  onEdit: (note: Note) => void;
  onTrash: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (note: Note) => void;
  onCopy: (note: Note) => void;
}) {
  const { t } = useTranslation();
  const status = note.status;
  const labels = note.labels;
  const [labelDraft, setLabelDraft] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  function addLabel() {
    const label = labelDraft.trim();
    if (!label || labels.includes(label)) return;
    onPatchNote(note.id, { labels: [...labels, label] });
    setLabelDraft('');
  }

  return (
    <article className={`notes-card notes-card--${note.color ?? 'default'}`}>
      <div className="notes-card__top">
        <button
          type="button"
          className="notes-icon-button"
          title={note.pinned ? t('notes.unpin') : t('notes.pin')}
          onClick={() => onPatchNote(note.id, { pinned: !note.pinned })}
        >
          {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </div>

      <button type="button" className="notes-card__content" onClick={() => onEdit(note)}>
        <h3>{note.title}</h3>
        <p>{note.content}</p>
      </button>

      {(labels.length > 0 || note.reminderAt) && (
        <div className="notes-card__chips">
          {labels.map((label) => (
            <span key={label} className="notes-chip">
              <Tag size={12} />
              {label}
              <button
                type="button"
                onClick={() => onPatchNote(note.id, { labels: labels.filter((item) => item !== label) })}
                title={t('notes.removeLabel')}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {note.reminderAt && (
            <span className="notes-chip">
              <Bell size={12} />
              {new Date(note.reminderAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {showLabels && (
        <div className="notes-inline-panel">
          <input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addLabel();
            }}
            placeholder={t('notes.labelPlaceholder')}
          />
          <button type="button" onClick={addLabel} title={t('notes.addLabel')}>
            <Check size={14} />
          </button>
        </div>
      )}

      {showReminder && (
        <div className="notes-inline-panel">
          <input
            type="datetime-local"
            value={note.reminderAt ?? ''}
            onChange={(event) => onPatchNote(note.id, { reminderAt: event.target.value || null })}
          />
          <button type="button" onClick={() => onPatchNote(note.id, { reminderAt: null })}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="notes-card__footer">
        <div className="notes-card__tools">
          <button type="button" title={t('notes.edit')} onClick={() => onEdit(note)}>
            <Edit2 size={12} />
          </button>
          <div className="notes-color-menu">
            <button type="button" title={t('notes.color')} aria-haspopup="true">
              <Palette size={12} />
            </button>
            <span>
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.key}
                  type="button"
                  title={color.label}
                  className={`notes-color-swatch notes-color-swatch--${color.key}`}
                  onClick={() => onPatchNote(note.id, { color: color.key })}
                />
              ))}
            </span>
          </div>
          <button type="button" title={t('notes.labels')} onClick={() => setShowLabels((current) => !current)}>
            <Tag size={12} />
          </button>
          <button type="button" title={t('notes.reminder')} onClick={() => setShowReminder((current) => !current)}>
            <Bell size={12} />
          </button>
          <button type="button" title={t('notes.copy')} onClick={() => onCopy(note)}>
            <Copy size={12} />
          </button>
          <button type="button" title={t('notes.duplicate')} onClick={() => onDuplicate(note)}>
            <Plus size={12} />
          </button>
        </div>
        <div className="notes-card__tools">
          {status === 'trashed' ? (
            <>
              <button type="button" title={t('notes.restore')} onClick={() => onPatchNote(note.id, { status: 'active' })}>
                <RotateCcw size={12} />
              </button>
              <button type="button" title={t('notes.deleteForever')} onClick={() => onDelete(note.id)}>
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                title={status === 'archived' ? t('notes.unarchive') : t('notes.archive')}
                onClick={() => onPatchNote(note.id, { status: status === 'archived' ? 'active' : 'archived', pinned: false })}
              >
                {status === 'archived' ? <ArchiveRestore size={12} /> : <Archive size={12} />}
              </button>
              <button type="button" title={t('notes.trash')} onClick={() => onTrash(note.id)}>
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
