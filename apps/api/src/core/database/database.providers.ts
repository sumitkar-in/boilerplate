import { Provider } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseConfig, type DatabaseConfig } from '../config';
import { coreSchema } from './schema/core-schema';

export const PG_POOL = 'PG_POOL';
export const CORE_DB = 'CORE_DB';

export type CoreDb = NodePgDatabase<typeof coreSchema>;

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [databaseConfig.KEY],
  useFactory: (database: DatabaseConfig): Pool =>
    new Pool({ connectionString: database.url }),
};

export const coreDbProvider: Provider = {
  provide: CORE_DB,
  inject: [PG_POOL],
  useFactory: (pool: Pool): CoreDb => drizzle(pool, { schema: coreSchema }),
};
