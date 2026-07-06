import { Injectable } from '@nestjs/common';
import { eq, sql, type SQL } from 'drizzle-orm';
import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateNoteDto } from './dto/create-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { note } from './entities/note';

const listConfig: ListQueryConfig = {
  fields: {
    title: note.title,
    content: note.content,
    status: note.status,
    pinned: note.pinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  },
  searchFields: ['title', 'content'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
};

@Injectable()
export class NotesService {
  constructor(private readonly tenantDb: TenantDbService) {}

  findAll(tenant: TenantContext, query: QueryNotesDto = {}) {
    const extra: SQL[] = [];
    if (query.status) extra.push(eq(note.status, query.status));
    if (query.pinned !== undefined) extra.push(eq(note.pinned, query.pinned));
    if (query.label) extra.push(sql`${note.labels} ? ${query.label}`);
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, note, query, listConfig, extra),
    );
  }

  async findOne(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.select().from(note).where(eq(note.id, id)).limit(1),
    );
    return assertFound(row, 'Note');
  }

  async create(tenant: TenantContext, dto: CreateNoteDto) {
    const { reminderAt, ...rest } = dto;
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(note)
        .values({
          ...rest,
          reminderAt: reminderAt ? new Date(reminderAt) : undefined,
        })
        .returning(),
    );
    return row;
  }

  async update(tenant: TenantContext, id: string, dto: UpdateNoteDto) {
    const { reminderAt, ...rest } = dto;
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(note)
        .set({
          ...rest,
          ...(reminderAt !== undefined
            ? { reminderAt: reminderAt ? new Date(reminderAt) : null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(note.id, id))
        .returning(),
    );
    return assertFound(row, 'Note');
  }

  async remove(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.delete(note).where(eq(note.id, id)).returning({ id: note.id }),
    );
    assertFound(row, 'Note');
    return { ok: true };
  }
}
