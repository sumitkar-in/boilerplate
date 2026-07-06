import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import type { ListQueryDto } from '../../core/common/query/list-query.dto';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { department } from './entities/department';

const listConfig: ListQueryConfig = {
  fields: {
    name: department.name,
    description: department.description,
    createdAt: department.createdAt,
  },
  searchFields: ['name', 'description'],
  defaultSort: { field: 'name', direction: 'asc' },
};

@Injectable()
export class DepartmentsService {
  constructor(private readonly tenantDb: TenantDbService) {}

  findAll(tenant: TenantContext, query: ListQueryDto = {}) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, department, query, listConfig),
    );
  }

  async findOne(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.select().from(department).where(eq(department.id, id)).limit(1),
    );
    return assertFound(row, 'Department');
  }

  async create(tenant: TenantContext, dto: CreateDepartmentDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.insert(department).values(dto).returning(),
    );
    return row;
  }

  async update(tenant: TenantContext, id: string, dto: UpdateDepartmentDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(department)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(department.id, id))
        .returning(),
    );
    return assertFound(row, 'Department');
  }

  async remove(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(department)
        .where(eq(department.id, id))
        .returning({ id: department.id }),
    );
    assertFound(row, 'Department');
    return { ok: true };
  }
}
