import { buildQueryString } from '@boilerplate/ui-common';
import { apiFetch } from '../../../core/api-client';

export type DocumentFormat = 'markdown' | 'rich_text';

export type DocSpace = {
  id: string;
  key: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentPage = {
  id: string;
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  format: DocumentFormat;
  content: string;
  version: string;
  labels: string[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentComment = {
  id: string;
  pageId: string;
  authorUserId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRevision = {
  id: string;
  pageId: string;
  version: string;
  title: string;
  format: DocumentFormat;
  content: string;
  labels: string[];
  savedBy: string | null;
  createdAt: string;
};

export type DocumentDetail = DocumentPage & {
  comments: DocumentComment[];
  revisions: DocumentRevision[];
};

export type PageInput = {
  spaceId: string;
  parentId?: string | null;
  title: string;
  format?: DocumentFormat;
  content?: string;
  labels?: string[];
};

export function listSpaces(): Promise<DocSpace[]> {
  return apiFetch<DocSpace[]>('/documents/spaces');
}

export function createSpace(input: { key: string; name: string; description?: string }): Promise<DocSpace> {
  return apiFetch<DocSpace>('/documents/spaces', { method: 'POST', body: input });
}

export function listPages(params: { spaceId?: string; search?: string; label?: string } = {}): Promise<{ rows: DocumentPage[]; total: number; limit: number; offset: number }> {
  return apiFetch(`/documents/pages${buildQueryString({
    spaceId: params.spaceId,
    search: params.search,
    label: params.label,
    limit: 500,
  })}`);
}

export function getPage(id: string): Promise<DocumentDetail> {
  return apiFetch<DocumentDetail>(`/documents/pages/${id}`);
}

export function createPage(input: PageInput): Promise<DocumentPage> {
  return apiFetch<DocumentPage>('/documents/pages', { method: 'POST', body: input });
}

export function updatePage(id: string, input: Partial<PageInput>): Promise<DocumentPage> {
  return apiFetch<DocumentPage>(`/documents/pages/${id}`, { method: 'PATCH', body: input });
}

export function deletePage(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/documents/pages/${id}`, { method: 'DELETE' });
}

export function addDocumentComment(id: string, body: string): Promise<DocumentComment> {
  return apiFetch<DocumentComment>(`/documents/pages/${id}/comments`, { method: 'POST', body: { body } });
}

export function restoreRevision(pageId: string, revisionId: string): Promise<DocumentPage> {
  return apiFetch<DocumentPage>(`/documents/pages/${pageId}/revisions/${revisionId}/restore`, { method: 'POST' });
}
