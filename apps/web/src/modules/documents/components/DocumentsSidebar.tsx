import { useMemo } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { Input } from '@boilerplate/ui-common';
import type { DocSpace, DocumentPage } from '../api';

type TreePage = DocumentPage & { children: TreePage[] };

function buildPageTree(pages: DocumentPage[]): TreePage[] {
  const byId = new Map<string, TreePage>();
  pages.forEach((page) => byId.set(page.id, { ...page, children: [] }));
  const roots: TreePage[] = [];
  byId.forEach((page) => {
    if (page.parentId && byId.has(page.parentId)) byId.get(page.parentId)!.children.push(page);
    else roots.push(page);
  });
  return roots;
}

export function DocumentsSidebar({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
  pages,
  selectedPageId,
  onSelectPage,
  onCreatePage,
  search,
  onSearchChange,
  label,
  onLabelChange,
}: {
  spaces: DocSpace[];
  selectedSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: () => void;
  pages: DocumentPage[];
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (parentId?: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  label: string;
  onLabelChange: (value: string) => void;
}) {
  const pageTree = useMemo(() => buildPageTree(pages), [pages]);

  return (
    <aside className="documents-sidebar">
      <div className="documents-sidebar__header">
        <strong>Spaces</strong>
        <button type="button" onClick={onCreateSpace} aria-label="Create space">
          <Plus size={15} />
        </button>
      </div>
      <div className="documents-space-list">
        {spaces.map((space) => (
          <button
            key={space.id}
            type="button"
            aria-pressed={space.id === selectedSpaceId}
            onClick={() => onSelectSpace(space.id)}
          >
            <span>{space.key}</span>
            <strong>{space.name}</strong>
          </button>
        ))}
      </div>
      <label className="documents-search">
        <Search size={15} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search docs" />
      </label>
      <Input label="Label filter" value={label} onChange={(event) => onLabelChange(event.target.value)} placeholder="runbook" />
      <div className="documents-sidebar__header">
        <strong>Pages</strong>
        <button type="button" onClick={() => onCreatePage()} aria-label="Create page">
          <Plus size={15} />
        </button>
      </div>
      <div className="documents-page-tree">
        {pageTree.map((page) => (
          <PageTreeItem
            key={page.id}
            page={page}
            selectedPageId={selectedPageId}
            onSelect={onSelectPage}
            onCreateChild={onCreatePage}
          />
        ))}
      </div>
    </aside>
  );
}

function PageTreeItem({ page, selectedPageId, onSelect, onCreateChild }: {
  page: TreePage;
  selectedPageId: string;
  onSelect: (id: string) => void;
  onCreateChild: (id: string) => void;
}) {
  return (
    <div className="documents-tree-item">
      <button type="button" aria-pressed={page.id === selectedPageId} onClick={() => onSelect(page.id)}>
        <FileText size={14} /> {page.title}
      </button>
      <button type="button" className="documents-tree-add" onClick={() => onCreateChild(page.id)} aria-label={`Create child page under ${page.title}`}>
        <Plus size={12} />
      </button>
      {page.children.length > 0 && (
        <div className="documents-tree-children">
          {page.children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              selectedPageId={selectedPageId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
