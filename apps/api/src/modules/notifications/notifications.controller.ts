import { Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import { ListQueryDto } from '../../core/common/query/list-query.dto';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { NotificationsService } from './notifications.service';

@TenantModuleController('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Lists notifications with search, filters, sorting, and pagination.',
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListQueryDto,
  ) {
    return this.notificationsService.findAll(tenant, query);
  }
}
