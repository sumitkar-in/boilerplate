import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import type { ListQueryDto } from '../../core/common/query/list-query.dto';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { visitor } from './entities/visitor';

const listConfig: ListQueryConfig = {
  fields: {
    createdAt: visitor.createdAt,
  },
  searchFields: [],
  defaultSort: { field: 'createdAt', direction: 'desc' },
};

@Injectable()
export class VisitorService {
  constructor(private readonly tenantDb: TenantDbService) {}

  findAll(tenant: TenantContext, query: ListQueryDto = {}) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, visitor, query, listConfig),
    );
  }

  async findOne(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.select().from(visitor).where(eq(visitor.id, id)).limit(1),
    );
    return assertFound(row, 'Visitor');
  }

  async create(tenant: TenantContext, dto: CreateVisitorDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.insert(visitor).values(dto).returning(),
    );
    return row;
  }

  async update(tenant: TenantContext, id: string, dto: UpdateVisitorDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(visitor)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(visitor.id, id))
        .returning(),
    );
    return assertFound(row, 'Visitor');
  }

  async remove(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(visitor)
        .where(eq(visitor.id, id))
        .returning({ id: visitor.id }),
    );
    assertFound(row, 'Visitor');
    return { ok: true };
  }
}
