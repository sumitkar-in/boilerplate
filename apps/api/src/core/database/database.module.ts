import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  CORE_DB,
  PG_POOL,
  coreDbProvider,
  pgPoolProvider,
} from './database.providers';
import { TenantDbService } from './tenant-db.service';

@Global()
@Module({
  providers: [pgPoolProvider, coreDbProvider, TenantDbService],
  exports: [PG_POOL, CORE_DB, TenantDbService],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
