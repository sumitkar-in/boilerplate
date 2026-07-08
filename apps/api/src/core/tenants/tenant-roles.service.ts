import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DEFAULT_TENANT_ROLES } from '@boilerplate/contracts';
import { CacheService, CACHE_TTLS } from '../cache/cache.service';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { tenantRoles } from '../database/schema/core-schema';

export type TenantRoleRecord = typeof tenantRoles.$inferSelect;

/**
 * Custom per-tenant RBAC roles (`core.tenant_roles`) — seeding the system
 * defaults on tenant provisioning, and CRUD for tenant-defined roles.
 * Split out of TenantsService as its own bounded concern.
 */
@Injectable()
export class TenantRolesService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly cache?: CacheService,
  ) {}

  async seedDefaultRoles(tenantId: string): Promise<void> {
    for (const role of DEFAULT_TENANT_ROLES) {
      await this.db
        .insert(tenantRoles)
        .values({
          tenantId,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: [...role.permissions],
          isSystem: role.isSystem,
        })
        .onConflictDoNothing();
    }
    await this.invalidateTenant(tenantId);
  }

  async listRoles(tenantId: string): Promise<TenantRoleRecord[]> {
    return this.remember(`tenant:${tenantId}:roles`, CACHE_TTLS.medium, () =>
      this.db
        .select()
        .from(tenantRoles)
        .where(eq(tenantRoles.tenantId, tenantId)),
    );
  }

  async createRole(
    tenantId: string,
    input: {
      key: string;
      name: string;
      description?: string;
      permissions: string[];
    },
  ): Promise<TenantRoleRecord> {
    const [role] = await this.db
      .insert(tenantRoles)
      .values({
        tenantId,
        key: input.key,
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        isSystem: false,
      })
      .returning();
    await this.invalidateTenant(tenantId);
    return role;
  }

  async updateRole(
    tenantId: string,
    key: string,
    input: {
      name?: string;
      description?: string;
      permissions?: string[];
    },
  ): Promise<TenantRoleRecord | undefined> {
    const [role] = await this.db
      .update(tenantRoles)
      .set({
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        updatedAt: new Date(),
      })
      .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.key, key)))
      .returning();
    await this.invalidateTenant(tenantId);
    return role;
  }

  async deleteRole(tenantId: string, key: string): Promise<void> {
    await this.db
      .delete(tenantRoles)
      .where(
        and(
          eq(tenantRoles.tenantId, tenantId),
          eq(tenantRoles.key, key),
          eq(tenantRoles.isSystem, false),
        ),
      );
    await this.invalidateTenant(tenantId);
  }

  async getRolePermissions(
    tenantId: string,
    roleKey: string,
  ): Promise<string[]> {
    return this.remember(
      `tenant:${tenantId}:role:${roleKey}:permissions`,
      CACHE_TTLS.long,
      async () => {
        const [role] = await this.db
          .select({ permissions: tenantRoles.permissions })
          .from(tenantRoles)
          .where(
            and(
              eq(tenantRoles.tenantId, tenantId),
              eq(tenantRoles.key, roleKey),
            ),
          )
          .limit(1);
        if (role) return role.permissions as string[];
        return (
          (DEFAULT_TENANT_ROLES.find((item) => item.key === roleKey)
            ?.permissions as unknown as string[]) ?? []
        );
      },
    );
  }

  private async remember<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!this.cache) {
      return await loader();
    }
    return await this.cache.remember(key, ttlSeconds, loader);
  }

  private async invalidateTenant(tenantId: string): Promise<void> {
    await this.cache?.deleteByPattern(`tenant:${tenantId}:*`);
  }
}
