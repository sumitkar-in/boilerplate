import { Inject, Injectable } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from './database.providers';
import { TenantContext } from '../tenants/tenant-context';

// Schema names are only ever produced by tenant-provisioning (sanitized
// there), but this is the last line of defense before string-interpolating
// one into `SET search_path` — reject anything unexpected rather than trust
// the caller.
const SAFE_SCHEMA_NAME = /^[a-z0-9_]+$/;

/**
 * Reusable tenant-scoped data access helper. Feature-module services
 * should use `withTenantDb()` instead of holding their own DB clients —
 * see skills/tenant-data-access/SKILL.md. Every call is scoped to
 * `tenant.schemaName` via `SET search_path`, so a query written against an
 * unqualified table name only ever sees that tenant's tables.
 */
@Injectable()
export class TenantDbService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async withTenantDb<T>(
    tenant: Pick<TenantContext, 'schemaName'>,
    fn: (db: NodePgDatabase) => Promise<T>,
  ): Promise<T> {
    if (!SAFE_SCHEMA_NAME.test(tenant.schemaName)) {
      throw new Error(`Unsafe schema name: "${tenant.schemaName}"`);
    }
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${tenant.schemaName}", public`);
      return await fn(drizzle(client));
    } finally {
      await client.query('RESET search_path');
      client.release();
    }
  }
}
