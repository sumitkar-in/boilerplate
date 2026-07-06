import { Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import { ListQueryDto } from '../../core/common/query/list-query.dto';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { {{FeatureName}}Service } from './{{featureKey}}.service';

@TenantModuleController('{{featureKey}}')
export class {{FeatureName}}Controller {
  constructor(private readonly {{featureName}}Service: {{FeatureName}}Service) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Lists {{featureKey}} with search, filters, sorting, and pagination.' })
  findAll(@CurrentTenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.{{featureName}}Service.findAll(tenant, query);
  }
}
