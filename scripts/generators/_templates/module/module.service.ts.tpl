import { Injectable } from '@nestjs/common';
import type { ListQueryDto } from '../../core/common/query/list-query.dto';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';

// Once entities exist (node scripts/generators/generate-entity.js
// --module={{featureKey}} --name=<entity>), the standard shape is:
//
//   import { assertFound, listAndCount } from '../../core/common/crud/crud.helpers';
//   import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
//
//   const listConfig: ListQueryConfig = {
//     fields: { name: entity.name, createdAt: entity.createdAt },
//     searchFields: ['name'],
//     defaultSort: { field: 'createdAt', direction: 'desc' },
//   };
//
//   findAll -> this.tenantDb.withTenantDb(tenant, (db) => listAndCount(db, entity, query, listConfig))
//   findOne/update/remove -> assertFound(row, '{{FeatureName}}')
//
// Postgres unique violations (23505) are translated to 409 globally by
// PostgresExceptionFilter — do not add per-service try/catch for them.
// See: skills/crud-module/SKILL.md, skills/tenant-data-access/SKILL.md

@Injectable()
export class {{FeatureName}}Service {
  constructor(private readonly tenantDb: TenantDbService) {}

  findAll(_tenant: TenantContext, _query: ListQueryDto = {}): Promise<unknown> {
    // TODO: implement with listAndCount once entities are generated
    return Promise.resolve({ rows: [], total: 0, limit: 50, offset: 0 });
  }
}
