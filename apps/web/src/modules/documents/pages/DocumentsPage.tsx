import { useCallback, useEffect, useState } from 'react';
import { Clock3, Edit3, FileText, MessageSquare, Plus, Save, X } from 'lucide-react';
import { Button, useToast } from '@boilerplate/ui-common';
import {
  addDocumentComment,
  createPage,
  createSpace,
  getPage,
  listPages,
  listSpaces,
  restoreRevision,
  updatePage,
  type DocSpace,
  type DocumentDetail,
  type DocumentPage,
} from '../api';
import { CreateSpaceModal, type SpaceForm } from '../components/CreateSpaceModal';
import { DocumentEditor } from '../components/DocumentEditor';
import { DocumentInspectorPanel, type InspectorPanel } from '../components/DocumentInspectorPanel';
import { DocumentReader } from '../components/DocumentReader';
import { DocumentsSidebar } from '../components/DocumentsSidebar';

const EMPTY_SPACE: SpaceForm = { key: '', name: '', description: '' };

export function DocumentsPage() {
  const { showToast } = useToast();
  const [spaces, setSpaces] = useState<DocSpace[]>([]);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [draft, setDraft] = useState<DocumentDetail | null>(null);
  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('');
  const [spaceForm, setSpaceForm] = useState<SpaceForm>(EMPTY_SPACE);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activePanel, setActivePanel] = useState<InspectorPanel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [comment, setComment] = useState('');

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);

  const loadPages = useCallback(async () => {
    if (!selectedSpaceId) {
      setPages([]);
      return;
    }
    const result = await listPages({
      spaceId: selectedSpaceId,
      search: search.trim() || undefined,
      label: label.trim() || undefined,
    });
    setPages(result.rows);
    setSelectedPageId((current) => current || result.rows[0]?.id || '');
  }, [label, search, selectedSpaceId]);

  useEffect(() => {
    let cancelled = false;
    listSpaces().then((result) => {
      if (cancelled) return;
      setSpaces(result);
      setSelectedSpaceId((current) => current || result[0]?.id || '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSpaceId) {
      void Promise.resolve().then(() => setPages([]));
      return;
    }
    let cancelled = false;
    listPages({
      spaceId: selectedSpaceId,
      search: search.trim() || undefined,
      label: label.trim() || undefined,
    }).then((result) => {
      if (cancelled) return;
      setPages(result.rows);
      setSelectedPageId((current) => current || result.rows[0]?.id || '');
    });
    return () => {
      cancelled = true;
    };
  }, [label, search, selectedSpaceId]);

  useEffect(() => {
    if (!selectedPageId) {
      void Promise.resolve().then(() => {
        setDetail(null);
        setDraft(null);
        setIsEditing(false);
        setActivePanel(null);
      });
      return;
    }

    getPage(selectedPageId).then((page) => {
      setDetail(page);
      setDraft(page);
      setIsEditing(false);
      setActivePanel(null);
    }, () => {
      setDetail(null);
      setDraft(null);
      setIsEditing(false);
      setActivePanel(null);
    });
  }, [selectedPageId]);

  async function saveSpace() {
    try {
      const space = await createSpace(spaceForm);
      setSpaces((current) => [...current, space]);
      setSelectedSpaceId(space.id);
      setSpaceForm(EMPTY_SPACE);
      setIsSpaceModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create space', 'error');
    }
  }

  async function createChildPage(parentId?: string | null) {
    if (!selectedSpaceId) {
      showToast('Create a space first', 'error');
      return;
    }
    try {
      const page = await createPage({
        spaceId: selectedSpaceId,
        parentId: parentId ?? null,
        title: 'Untitled page',
        format: 'rich_text',
        content: '',
      });
      setPages((current) => [...current, page]);
      setSelectedPageId(page.id);
      setIsEditing(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create page', 'error');
    }
  }

  async function savePage() {
    if (!draft) return;
    setIsSaving(true);
    try {
      const page = await updatePage(draft.id, {
        title: draft.title,
        format: draft.format,
        content: draft.content,
        labels: draft.labels,
        parentId: draft.parentId,
        spaceId: draft.spaceId,
      });
      setPages((current) => current.map((item) => (item.id === page.id ? page : item)));
      const updated = await getPage(page.id);
      setDetail(updated);
      setDraft(updated);
      setIsEditing(false);
      showToast('Page saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save page', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveComment() {
    if (!detail || !comment.trim()) return;
    try {
      await addDocumentComment(detail.id, comment.trim());
      setComment('');
      const updated = await getPage(detail.id);
      setDetail(updated);
      setDraft(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add comment', 'error');
    }
  }

  async function restore(pageId: string, revisionId: string) {
    try {
      await restoreRevision(pageId, revisionId);
      const restored = await getPage(pageId);
      setDetail(restored);
      setDraft(restored);
      setIsEditing(false);
      await loadPages();
      showToast('Revision restored', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not restore revision', 'error');
    }
  }

  function selectSpace(spaceId: string) {
    setSelectedSpaceId(spaceId);
    setSelectedPageId('');
    setIsEditing(false);
    setActivePanel(null);
  }

  function startEditing() {
    if (!detail) return;
    setDraft(detail);
    setIsEditing(true);
    setActivePanel(null);
  }

  function cancelEditing() {
    setDraft(detail);
    setIsEditing(false);
  }

  return (
    <section className="documents-page" aria-label="Documents">
      <DocumentsSidebar
        spaces={spaces}
        selectedSpaceId={selectedSpaceId}
        onSelectSpace={selectSpace}
        onCreateSpace={() => setIsSpaceModalOpen(true)}
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onCreatePage={(parentId) => void createChildPage(parentId)}
        search={search}
        onSearchChange={setSearch}
        label={label}
        onLabelChange={setLabel}
      />

      <main className="documents-main">
        <div className="documents-topbar">
          <div>
            <p>
              {selectedSpace?.name ?? 'Documentation'}
              {detail && !isEditing ? ` · Updated ${new Date(detail.updatedAt).toLocaleDateString()}` : ''}
            </p>
            <h1>{detail?.title ?? 'Select or create a page'}</h1>
          </div>
          {detail && (
            <div className="documents-topbar__actions">
              {isEditing ? (
                <>
                  <Button variant="ghost" onClick={cancelEditing} disabled={isSaving}>
                    <X size={16} /> Cancel
                  </Button>
                  <Button variant="primary" onClick={() => void savePage()} disabled={!draft || isSaving}>
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={activePanel === 'comments' ? 'secondary' : 'ghost'}
                    onClick={() => setActivePanel((current) => (current === 'comments' ? null : 'comments'))}
                  >
                    <MessageSquare size={16} /> Comments
                  </Button>
                  <Button
                    variant={activePanel === 'history' ? 'secondary' : 'ghost'}
                    onClick={() => setActivePanel((current) => (current === 'history' ? null : 'history'))}
                  >
                    <Clock3 size={16} /> History
                  </Button>
                  <Button variant="primary" onClick={startEditing}>
                    <Edit3 size={16} /> Edit
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {detail ? (
          <div className="documents-workspace">
            {isEditing && draft ? (
              <DocumentEditor draft={draft} onChange={setDraft} />
            ) : (
              <DocumentReader detail={detail} />
            )}

            {activePanel && !isEditing && (
              <DocumentInspectorPanel
                panel={activePanel}
                detail={detail}
                comment={comment}
                onCommentChange={setComment}
                onSaveComment={() => void saveComment()}
                onRestore={(revisionId) => void restore(detail.id, revisionId)}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        ) : (
          <div className="documents-empty">
            <FileText size={32} />
            <h2>No page selected</h2>
            <p>Create a page in {selectedSpace?.name ?? 'a space'} to start documenting.</p>
            <Button variant="primary" onClick={() => void createChildPage()}><Plus size={16} /> New page</Button>
          </div>
        )}
      </main>

      <CreateSpaceModal
        isOpen={isSpaceModalOpen}
        form={spaceForm}
        onChange={setSpaceForm}
        onClose={() => setIsSpaceModalOpen(false)}
        onSave={() => void saveSpace()}
      />
    </section>
  );
}
