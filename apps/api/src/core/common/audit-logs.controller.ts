import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import type { TenantContext } from '../tenants/tenant-context';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller()
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('audit-logs')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOkResponse({ description: 'List audit logs for current tenant.' })
  listTenantAuditLogs(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogService.list({
      tenantId: tenant.tenantId,
      userId: query.userId,
      action: query.action,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('audit-logs/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOkResponse({ description: 'Get a specific audit log by ID.' })
  async getTenantAuditLog(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    const row = await this.auditLogService.findById(id);
    if (!row || row.tenantId !== tenant.tenantId) {
      throw new NotFoundException('Audit log not found');
    }
    return row;
  }

  @Get('admin/audit-logs')
  @UseGuards(SuperAdminGuard)
  @ApiOkResponse({
    description: 'List all audit logs across all tenants (super admin).',
  })
  listGlobalAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditLogService.list({
      tenantId: query.tenantId,
      userId: query.userId,
      action: query.action,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
