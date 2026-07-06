import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { tenants } from '../database/schema/core-schema';

export type ActiveTenant = {
  id: string;
  slug: string;
  schemaName: string;
};

/**
 * Iterates active tenants — used by any module's cron fan-out (a @Cron()
 * sweep finds the tenants that have the feature enabled, then fans the
 * actual work out per-tenant into a queue). See: skills/cron-jobs/SKILL.md
 */
@Injectable()
export class TenantSweepService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  async getActiveTenants(): Promise<ActiveTenant[]> {
    return this.db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        schemaName: tenants.schemaName,
      })
      .from(tenants)
      .where(eq(tenants.status, 'active'));
  }
}
