import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { CACHE_TTLS, CacheService } from '../../core/cache/cache.service';
import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateDocumentCommentDto } from './dto/create-document-comment.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { QueryPagesDto } from './dto/query-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { docSpace } from './entities/doc-space';
import { documentComment } from './entities/document-comment';
import { documentPage, type DocumentFormat } from './entities/document-page';
import { documentRevision } from './entities/document-revision';

const RICH_TEXT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'hr',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'strong',
    'em',
    'u',
    's',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer',
      target: '_blank',
    }),
  },
};

// Rich-text content comes from the Quill editor as raw HTML; markdown content is
// plain text that gets HTML-escaped at render time. Only rich_text needs sanitizing
// here, but we always run it through so a format switch can't smuggle raw HTML through.
function sanitizeDocumentContent(
  format: DocumentFormat | undefined,
  content: string,
) {
  if (format !== 'rich_text') return content;
  return sanitizeHtml(content, RICH_TEXT_SANITIZE_OPTIONS);
}

const pageListConfig: ListQueryConfig = {
  fields: {
    title: documentPage.title,
    slug: documentPage.slug,
    format: documentPage.format,
    content: documentPage.content,
    updatedAt: documentPage.updatedAt,
  },
  searchFields: ['title', 'content', 'slug'],
  defaultSort: { field: 'updatedAt', direction: 'desc' },
};

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'page'
  );
}

function normalizeLabels(labels: string[] | undefined) {
  return Array.from(
    new Set((labels ?? []).map((label) => label.trim()).filter(Boolean)),
  );
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly cache?: CacheService,
  ) {}

  listSpaces(tenant: TenantContext) {
    return this.remember(tenant, 'documents:spaces', CACHE_TTLS.medium, () =>
      this.tenantDb.withTenantDb(tenant, (db) =>
        db.select().from(docSpace).orderBy(asc(docSpace.name)),
      ),
    );
  }

  async createSpace(tenant: TenantContext, dto: CreateSpaceDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(docSpace)
        .values({
          key: dto.key.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
        })
        .returning(),
    );
    await this.invalidateSpaces(tenant);
    return row;
  }

  async updateSpace(tenant: TenantContext, id: string, dto: UpdateSpaceDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(docSpace)
        .set({
          ...(dto.key !== undefined
            ? { key: dto.key.trim().toUpperCase() }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(docSpace.id, id))
        .returning(),
    );
    await this.invalidateSpaces(tenant);
    return assertFound(row, 'Space');
  }

  listPages(tenant: TenantContext, query: QueryPagesDto) {
    const extra: SQL[] = [];
    if (query.spaceId) extra.push(eq(documentPage.spaceId, query.spaceId));
    if (query.label) extra.push(sql`${documentPage.labels} ? ${query.label}`);
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, documentPage, query, pageListConfig, extra),
    );
  }

  async findPage(tenant: TenantContext, id: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [page] = await db
        .select()
        .from(documentPage)
        .where(eq(documentPage.id, id))
        .limit(1);
      const found = assertFound(page, 'Page');
      const [comments, revisions] = await Promise.all([
        db
          .select()
          .from(documentComment)
          .where(eq(documentComment.pageId, id))
          .orderBy(asc(documentComment.createdAt)),
        db
          .select()
          .from(documentRevision)
          .where(eq(documentRevision.pageId, id))
          .orderBy(asc(documentRevision.createdAt)),
      ]);
      return { ...found, comments, revisions };
    });
  }

  async createPage(tenant: TenantContext, dto: CreatePageDto) {
    const format = dto.format ?? 'markdown';
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(documentPage)
        .values({
          spaceId: dto.spaceId,
          parentId: dto.parentId ?? null,
          title: dto.title.trim(),
          slug: slugify(dto.title),
          format,
          content: sanitizeDocumentContent(format, dto.content ?? ''),
          labels: normalizeLabels(dto.labels),
          createdBy: tenant.userId,
          updatedBy: tenant.userId,
        })
        .returning(),
    );
    return row;
  }

  async updatePage(tenant: TenantContext, id: string, dto: UpdatePageDto) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [before] = await db
        .select()
        .from(documentPage)
        .where(eq(documentPage.id, id))
        .limit(1);
      if (!before) throw new NotFoundException('Page not found');
      await db.insert(documentRevision).values({
        pageId: before.id,
        version: before.version,
        title: before.title,
        format: before.format,
        content: before.content,
        labels: before.labels,
        savedBy: tenant.userId,
      });
      const nextVersion = String(Number(before.version) + 1);
      const effectiveFormat = dto.format ?? before.format;
      const [row] = await db
        .update(documentPage)
        .set({
          ...(dto.spaceId !== undefined ? { spaceId: dto.spaceId } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.title !== undefined
            ? { title: dto.title.trim(), slug: slugify(dto.title) }
            : {}),
          ...(dto.format !== undefined ? { format: dto.format } : {}),
          ...(dto.content !== undefined
            ? { content: sanitizeDocumentContent(effectiveFormat, dto.content) }
            : {}),
          ...(dto.labels !== undefined
            ? { labels: normalizeLabels(dto.labels) }
            : {}),
          version: nextVersion,
          updatedBy: tenant.userId,
          updatedAt: new Date(),
        })
        .where(eq(documentPage.id, id))
        .returning();
      return row;
    });
  }

  async restoreRevision(
    tenant: TenantContext,
    pageId: string,
    revisionId: string,
  ) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const [revision] = await db
        .select()
        .from(documentRevision)
        .where(
          and(
            eq(documentRevision.id, revisionId),
            eq(documentRevision.pageId, pageId),
          ),
        )
        .limit(1);
      if (!revision) throw new NotFoundException('Revision not found');
      const [row] = await db
        .update(documentPage)
        .set({
          title: revision.title,
          slug: slugify(revision.title),
          format: revision.format,
          content: revision.content,
          labels: revision.labels,
          updatedBy: tenant.userId,
          updatedAt: new Date(),
        })
        .where(eq(documentPage.id, pageId))
        .returning();
      return row;
    });
  }

  async removePage(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(documentPage)
        .where(eq(documentPage.id, id))
        .returning({ id: documentPage.id }),
    );
    assertFound(row, 'Page');
    return { ok: true };
  }

  async addComment(
    tenant: TenantContext,
    pageId: string,
    dto: CreateDocumentCommentDto,
  ) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(documentComment)
        .values({
          pageId,
          authorUserId: tenant.userId,
          body: dto.body.trim(),
        })
        .returning(),
    );
    return row;
  }

  private cacheKey(tenant: TenantContext, key: string): string {
    return `tenant:${tenant.tenantId}:${key}`;
  }

  private remember<T>(
    tenant: TenantContext,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    return (
      this.cache?.remember(this.cacheKey(tenant, key), ttlSeconds, loader) ??
      loader()
    );
  }

  private async invalidateSpaces(tenant: TenantContext): Promise<void> {
    await this.cache?.del(this.cacheKey(tenant, 'documents:spaces'));
  }
}
