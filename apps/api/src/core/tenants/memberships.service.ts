import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, or, sql, type SQL } from 'drizzle-orm';
import { toLegacyTenantRole, type TenantRole } from '@boilerplate/contracts';
import { CacheService } from '../cache/cache.service';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { tenantMemberships, users } from '../database/schema/core-schema';
import type { QueryMembersDto } from './dto/query-members.dto';

export type MembershipRecord = typeof tenantMemberships.$inferSelect;
export type MembershipStatus = 'invited' | 'active';

/**
 * Tenant membership CRUD — who belongs to a tenant, at what role/status.
 * Split out of TenantsService (which owns the tenant record itself) so
 * membership logic doesn't grow the tenant god-file further.
 */
@Injectable()
export class MembershipsService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly cache?: CacheService,
  ) {}

  async getMembership(
    tenantId: string,
    userId: string,
  ): Promise<MembershipRecord | undefined> {
    const [membership] = await this.db
      .select()
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      )
      .limit(1);
    return membership;
  }

  async listMembers(tenantId: string, query: QueryMembersDto = {}) {
    if (!tenantId)
      return {
        rows: [],
        total: 0,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      };

    const conditions: SQL[] = [eq(tenantMemberships.tenantId, tenantId)];
    const search = query.search?.trim();
    if (search) {
      const term = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
      conditions.push(
        or(
          sql`${users.email} ILIKE ${term}`,
          sql`${users.fullName} ILIKE ${term}`,
        )!,
      );
    }
    if (query.status)
      conditions.push(eq(tenantMemberships.status, query.status));
    const where = and(...conditions);

    const sortDir = query.sortDir ?? 'asc';
    const sortColumn =
      query.sortBy === 'fullName'
        ? users.fullName
        : query.sortBy === 'role'
          ? tenantMemberships.role
          : query.sortBy === 'status'
            ? tenantMemberships.status
            : users.email;
    const orderBy = sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const rows = await this.db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        role: tenantMemberships.role,
        roleKey: tenantMemberships.roleKey,
        status: tenantMemberships.status,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(users.id, tenantMemberships.userId))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(tenantMemberships)
      .innerJoin(users, eq(users.id, tenantMemberships.userId))
      .where(where);

    return { rows, total, limit, offset };
  }

  async createMembership(input: {
    tenantId: string;
    userId: string;
    role: TenantRole;
    roleKey?: string;
    status?: MembershipStatus;
  }): Promise<MembershipRecord> {
    const status = input.status ?? 'invited';
    const roleKey = input.roleKey ?? input.role;
    const [membership] = await this.db
      .insert(tenantMemberships)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        role: input.role,
        roleKey,
        status,
      })
      .onConflictDoUpdate({
        target: [tenantMemberships.tenantId, tenantMemberships.userId],
        set: { role: input.role, roleKey, status, updatedAt: new Date() },
      })
      .returning();
    await this.invalidateTenant(input.tenantId);
    return membership;
  }

  async updateMemberRole(
    tenantId: string,
    userId: string,
    role: TenantRole,
  ): Promise<void> {
    await this.db
      .update(tenantMemberships)
      .set({ role, roleKey: role, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      );
    await this.invalidateTenant(tenantId);
  }

  async updateMemberRoleKey(
    tenantId: string,
    userId: string,
    roleKey: string,
  ): Promise<void> {
    const role = toLegacyTenantRole(roleKey);
    await this.db
      .update(tenantMemberships)
      .set({ role, roleKey, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      );
    await this.invalidateTenant(tenantId);
  }

  async activateMembership(tenantId: string, userId: string): Promise<void> {
    await this.db
      .update(tenantMemberships)
      .set({ status: 'active', updatedAt: new Date() })
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      );
    await this.invalidateTenant(tenantId);
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    await this.db
      .delete(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      );
    await this.invalidateTenant(tenantId);
  }

  private async invalidateTenant(tenantId: string): Promise<void> {
    await this.cache?.deleteByPattern(`tenant:${tenantId}:*`);
  }
}
