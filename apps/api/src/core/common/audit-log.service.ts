import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { auditLogs, tenants, users } from '../database/schema/core-schema';

export type AuditLogRecord = {
  id: string;
  tenantId: string | null;
  tenantSlug: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  metadata: unknown;
  createdAt: Date;
};

@Injectable()
export class AuditLogService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  async log(input: {
    tenantId?: string | null;
    userId?: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(auditLogs).values({
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      metadata: input.metadata,
    });
  }

  async list(filter?: {
    tenantId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogRecord[]> {
    const conditions: SQL[] = [];
    if (filter?.tenantId) {
      conditions.push(eq(auditLogs.tenantId, filter.tenantId));
    }
    if (filter?.userId) {
      conditions.push(eq(auditLogs.userId, filter.userId));
    }
    if (filter?.action) {
      conditions.push(eq(auditLogs.action, filter.action));
    }

    return this.db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        tenantSlug: tenants.slug,
        userId: auditLogs.userId,
        userEmail: users.email,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))

      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filter?.limit ?? 100)
      .offset(filter?.offset ?? 0);
  }

  async listForTenant(tenantId: string): Promise<AuditLogRecord[]> {
    return this.list({ tenantId });
  }

  async findById(id: string): Promise<AuditLogRecord | undefined> {
    const [row] = await this.db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        tenantSlug: tenants.slug,
        userId: auditLogs.userId,
        userEmail: users.email,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
      .where(eq(auditLogs.id, id))
      .limit(1);
    return row;
  }
}
