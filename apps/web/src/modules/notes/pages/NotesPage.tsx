import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Grid2X2,
  List,
  Plus,
  Search,
} from 'lucide-react';
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type Note,
  type NoteInput,
} from '../api';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Textarea,
  useToast,
} from '@boilerplate/ui-common';
import { FilterButton } from '../components/FilterButton';
import { NoteComposer } from '../components/NoteComposer';
import { NoteSection } from '../components/NoteSection';
import type { NoteFilter, NotePatch, ViewMode } from '../components/types';

export function NotesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [counts, setCounts] = useState({ active: 0, archived: 0, trashed: 0, all: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState<NoteInput>({ title: '', content: '' });
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState<NoteInput>({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const data = await listNotes({
        search: search.trim() || undefined,
        status: filter === 'all' ? undefined : filter,
        limit: 200,
        offset: 0,
        sortBy: 'updatedAt',
        sortDir: 'desc',
      });
      setNotes(data.rows);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('notes.loadFailed'), 'error');
    }
  }, [filter, search, showToast, t]);

  useEffect(() => {
    const timer = setTimeout(() => void loadNotes(), 250);
    return () => clearTimeout(timer);
  }, [loadNotes]);

  // Status tabs need counts across all statuses, independent of the active filter —
  // fetch each count whenever search changes (cheap: limit 1, only reads `total`).
  useEffect(() => {
    let cancelled = false;
    const search_ = search.trim() || undefined;
    Promise.all([
      listNotes({ search: search_, status: 'active', limit: 1 }),
      listNotes({ search: search_, status: 'archived', limit: 1 }),
      listNotes({ search: search_, status: 'trashed', limit: 1 }),
      listNotes({ search: search_, limit: 1 }),
    ]).then(
      ([active, archived, trashed, all]) => {
        if (cancelled) return;
        setCounts({ active: active.total, archived: archived.total, trashed: trashed.total, all: all.total });
      },
      () => {},
    );
    return () => { cancelled = true; };
  }, [search]);

  const visibleNotes = useMemo(() => {
    const rows = notes ?? [];
    return [...rows].sort((a, b) => {
      const pinnedDelta = Number(b.pinned) - Number(a.pinned);
      if (pinnedDelta !== 0) return pinnedDelta;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes]);

  const pinnedNotes = visibleNotes.filter((note) => note.pinned);
  const otherNotes = visibleNotes.filter((note) => !note.pinned);

  async function patchNote(id: string, patch: NotePatch) {
    try {
      const updated = await updateNote(id, patch);
      setNotes((current) => current?.map((note) => (note.id === id ? updated : note)) ?? current);
      setCounts((current) => ({ ...current })); // counts may have shifted; cheap enough to just reload below
      void loadCountsQuietly();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('notes.saveFailed'), 'error');
    }
  }

  async function loadCountsQuietly() {
    const search_ = search.trim() || undefined;
    try {
      const [active, archived, trashed, all] = await Promise.all([
        listNotes({ search: search_, status: 'active', limit: 1 }),
        listNotes({ search: search_, status: 'archived', limit: 1 }),
        listNotes({ search: search_, status: 'trashed', limit: 1 }),
        listNotes({ search: search_, limit: 1 }),
      ]);
      setCounts({ active: active.total, archived: archived.total, trashed: trashed.total, all: all.total });
    } catch {
      // Non-critical — tab counts just stay stale until the next successful reload.
    }
    if (filter !== 'all') await loadNotes();
  }

  async function saveInput(input: NoteInput, editingId?: string) {
    const title = input.title.trim() || t('notes.untitled');
    const content = input.content.trim();
    if (!content) {
      showToast(t('notes.validationRequired'), 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) await updateNote(editingId, { title, content });
      else await createNote({ title, content });
      showToast(t('notes.saveSuccess'), 'success');
      setComposer({ title: '', content: '' });
      setComposerOpen(false);
      setEditing(null);
      await loadNotes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('notes.saveFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({ title: note.title, content: note.content });
  }

  async function handleDuplicate(note: Note) {
    try {
      await createNote({
        title: `${note.title} ${t('notes.copySuffix')}`,
        content: note.content,
        color: note.color ?? undefined,
        labels: note.labels,
      });
      showToast(t('notes.duplicateSuccess'), 'success');
      await loadNotes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('notes.saveFailed'), 'error');
    }
  }

  async function handleCopy(note: Note) {
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      showToast(t('notes.copied'), 'success');
    } catch {
      showToast(t('notes.copyFailed'), 'error');
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteNote(pendingDeleteId);
      showToast(t('notes.deleteSuccess'), 'success');
      setPendingDeleteId(null);
      await loadNotes();
      await loadCountsQuietly();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('notes.deleteFailed'), 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  const hasNoNotes = notes !== null && counts.all === 0;
  const hasNoVisibleNotes = notes !== null && counts.all > 0 && visibleNotes.length === 0;

  return (
    <section className="boilerplate-view-container notes-keep-view" aria-label={t('notes.title')}>
      <div className="notes-keep-header">
        <div>
          <h1>{t('notes.allNotes')}</h1>
          <p>{t('notes.subtitle')}</p>
        </div>
        <div className="notes-keep-header__actions">
          <button
            type="button"
            className="notes-icon-button"
            aria-pressed={viewMode === 'grid'}
            title={viewMode === 'grid' ? t('notes.listView') : t('notes.gridView')}
            onClick={() => setViewMode((current) => (current === 'grid' ? 'list' : 'grid'))}
          >
            {viewMode === 'grid' ? <List size={18} /> : <Grid2X2 size={18} />}
          </button>
          <Button variant="primary" onClick={() => setComposerOpen(true)}>
            <Plus size={16} />
            {t('notes.createNote')}
          </Button>
        </div>
      </div>

      <NoteComposer
        open={composerOpen}
        value={composer}
        isSubmitting={isSubmitting}
        onChange={setComposer}
        onCancel={() => {
          setComposer({ title: '', content: '' });
          setComposerOpen(false);
        }}
        onSave={() => void saveInput(composer)}
      />

      <div className="notes-keep-controls">
        <label className="notes-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('notes.searchPlaceholder')}
          />
        </label>
        <div className="notes-filter-tabs" role="tablist" aria-label={t('notes.filterLabel')}>
          <FilterButton active={filter === 'active'} onClick={() => setFilter('active')} label={t('notes.active')} count={counts.active} />
          <FilterButton active={filter === 'archived'} onClick={() => setFilter('archived')} label={t('notes.archived')} count={counts.archived} />
          <FilterButton active={filter === 'trashed'} onClick={() => setFilter('trashed')} label={t('notes.trash')} count={counts.trashed} />
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={t('notes.all')} count={counts.all} />
        </div>
      </div>

      <div className="ui-page-body notes-keep-body">
        {hasNoNotes ? (
          <EmptyState
            className="card empty-state--spacious"
            icon={<Plus size={28} />}
            title={t('notes.emptyTitle')}
            description={t('notes.emptyDescription')}
            action={
              <Button variant="primary" onClick={() => setComposerOpen(true)}>
                <Plus size={16} />
                {t('notes.createNote')}
              </Button>
            }
          />
        ) : hasNoVisibleNotes ? (
          <EmptyState
            className="card empty-state--spacious"
            icon={<Search size={28} />}
            title={t('notes.emptyFilteredTitle')}
            description={t('notes.emptyFilteredDescription')}
          />
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <NoteSection
                title={t('notes.pinned')}
                notes={pinnedNotes}
                viewMode={viewMode}
                onPatchNote={patchNote}
                onEdit={openEdit}
                onTrash={(id) => void patchNote(id, { status: 'trashed', pinned: false })}
                onDelete={setPendingDeleteId}
                onDuplicate={(note) => void handleDuplicate(note)}
                onCopy={(note) => void handleCopy(note)}
              />
            )}
            <NoteSection
              title={pinnedNotes.length > 0 ? t('notes.others') : t('notes.notes')}
              notes={otherNotes}
              viewMode={viewMode}
              onPatchNote={patchNote}
              onEdit={openEdit}
              onTrash={(id) => void patchNote(id, { status: 'trashed', pinned: false })}
              onDelete={setPendingDeleteId}
              onDuplicate={(note) => void handleDuplicate(note)}
              onCopy={(note) => void handleCopy(note)}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={t('notes.editModalTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={isSubmitting}>
              {t('notes.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => editing && void saveInput(form, editing.id)}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('notes.saving') : t('notes.save')}
            </Button>
          </>
        }
      >
        <Input
          label={t('notes.titleLabel')}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder={t('notes.titlePlaceholder')}
        />
        <Textarea
          label={t('notes.contentLabel')}
          value={form.content}
          onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
          rows={6}
          placeholder={t('notes.contentPlaceholder')}
          required
        />
      </Modal>

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title={t('notes.deleteConfirmTitle')}
        message={t('notes.deleteConfirm')}
        confirmLabel={t('notes.deleteForever')}
        cancelLabel={t('notes.cancel')}
        danger
        isConfirming={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </section>
  );
}
