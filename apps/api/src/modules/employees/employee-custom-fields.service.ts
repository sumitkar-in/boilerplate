import { Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { CACHE_TTLS, CacheService } from '../../core/cache/cache.service';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { employee } from './entities/employee';
import { employeeCustomField } from './entities/employee-custom-field';

function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'field'
  );
}

@Injectable()
export class EmployeeCustomFieldsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly cache?: CacheService,
  ) {}

  findAll(tenant: TenantContext) {
    return this.remember(
      tenant,
      'employees:custom-fields',
      CACHE_TTLS.medium,
      () =>
        this.tenantDb.withTenantDb(tenant, (db) =>
          db
            .select()
            .from(employeeCustomField)
            .orderBy(asc(employeeCustomField.createdAt)),
        ),
    );
  }

  async create(tenant: TenantContext, dto: CreateCustomFieldDto) {
    const row = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const existing = await db
        .select({ fieldKey: employeeCustomField.fieldKey })
        .from(employeeCustomField);
      const taken = new Set(existing.map((row) => row.fieldKey));
      const base = slugify(dto.label);
      let fieldKey = base;
      for (let suffix = 2; taken.has(fieldKey); suffix += 1) {
        fieldKey = `${base}-${suffix}`;
      }
      const [row] = await db
        .insert(employeeCustomField)
        .values({
          fieldKey,
          label: dto.label.trim(),
          type: dto.type ?? 'text',
          options: dto.type === 'select' ? (dto.options ?? []) : [],
        })
        .returning();
      return row;
    });
    await this.invalidateCustomFields(tenant);
    return row;
  }

  async update(tenant: TenantContext, id: string, dto: UpdateCustomFieldDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(employeeCustomField)
        .set({
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.options !== undefined ? { options: dto.options } : {}),
          updatedAt: new Date(),
        })
        .where(eq(employeeCustomField.id, id))
        .returning(),
    );
    if (!row) throw new NotFoundException('Custom field not found');
    await this.invalidateCustomFields(tenant);
    return row;
  }

  async remove(tenant: TenantContext, id: string) {
    const result = await this.tenantDb.withTenantDb(tenant, async (db) => {
      const [row] = await db
        .delete(employeeCustomField)
        .where(eq(employeeCustomField.id, id))
        .returning({ fieldKey: employeeCustomField.fieldKey });
      if (!row) throw new NotFoundException('Custom field not found');
      // Strip the orphaned key from every employee row so stale values
      // don't resurface if a field with the same key is recreated later.
      await db
        .update(employee)
        .set({ customFields: sql`${employee.customFields} - ${row.fieldKey}` });
      return { ok: true as const };
    });
    await this.invalidateCustomFields(tenant);
    return result;
  }

  private cacheKey(tenant: TenantContext): string {
    return `tenant:${tenant.tenantId}:employees:custom-fields`;
  }

  private async remember<T>(
    tenant: TenantContext,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = `tenant:${tenant.tenantId}:${key}`;
    if (!this.cache) {
      return await loader();
    }
    return await this.cache.remember(cacheKey, ttlSeconds, loader);
  }

  private async invalidateCustomFields(tenant: TenantContext): Promise<void> {
    await this.cache?.del(this.cacheKey(tenant));
  }
}
