import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogService } from '../common/audit-log.service';
import { QueryAuditLogsDto } from '../common/dto/query-audit-logs.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { QueryTenantsDto } from './dto/query-tenants.dto';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { UpdateTenantFeatureDto } from './dto/update-tenant-feature.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { MembershipsService } from './memberships.service';
import { MenuPreferencesService } from './menu-preferences.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import type { TenantContext } from './tenant-context';
import { TenantsService } from './tenants.service';

// Platform-wide tenant management — every route here operates across all
// tenants, not just the caller's current one, so it's gated on
// SuperAdminGuard rather than RolesGuard/@Roles(). See
// core/auth/auth.service.ts (resolveRole) for how a user becomes a super
// admin, and scripts/database/seed-super-admin.js to create one.
@ApiTags('admin tenants')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly menuPreferencesService: MenuPreferencesService,
    private readonly tenantProvisioningService: TenantProvisioningService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOkResponse({
    description:
      'Lists tenants with search, status filter, sorting, and pagination.',
  })
  listTenants(@Query() query: QueryTenantsDto) {
    return this.tenantsService.listAll(query);
  }

  @Get('available-modules')
  @ApiOkResponse({
    description: 'Lists modules available for tenant provisioning.',
  })
  listAvailableModules() {
    return this.tenantProvisioningService.listAvailableModules();
  }

  @Get('menu-order')
  @ApiOkResponse({ description: 'Returns the global menu order.' })
  async getGlobalMenuOrder() {
    return {
      itemOrder: await this.menuPreferencesService.getMenuOrder(null),
    };
  }

  @Patch('menu-order')
  @ApiOkResponse({ description: 'Updates the global menu order.' })
  updateGlobalMenuOrder(
    @CurrentTenant() current: TenantContext,
    @Body() dto: UpdateMenuOrderDto,
  ) {
    return this.menuPreferencesService.updateGlobalMenuOrder(
      dto.itemOrder,
      current.userId,
    );
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Provisions a tenant with selected features.',
  })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantProvisioningService.provisionTenant(
      dto.slug,
      dto.features,
    );
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Updates tenant status.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    await this.tenantsService.updateStatus(id, dto.status);
    return { ok: true };
  }

  @Get(':id/members')
  @ApiOkResponse({ description: 'Lists users in a tenant.' })
  async listTenantMembers(@Param('id') id: string) {
    const { rows } = await this.membershipsService.listMembers(id, {
      limit: 500,
    });
    return rows;
  }

  @Get(':id/menu-order')
  @ApiOkResponse({
    description:
      'Returns the tenant-specific menu order, falling back to the global order.',
  })
  async getTenantMenuOrder(@Param('id') id: string) {
    return {
      itemOrder: await this.menuPreferencesService.getMenuOrder(id),
    };
  }

  @Patch(':id/menu-order')
  @ApiOkResponse({
    description:
      'Updates a tenant-specific menu order using only options available to that tenant.',
  })
  updateTenantMenuOrder(
    @CurrentTenant() current: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMenuOrderDto,
  ) {
    return this.menuPreferencesService.updateTenantMenuOrder(
      id,
      dto.itemOrder,
      current.userId,
    );
  }

  @Get(':id/features')
  @ApiOkResponse({
    description: 'Lists every available feature and tenant enablement state.',
  })
  async listTenantFeatures(@Param('id') id: string) {
    const [availableModules, enabledByKey] = await Promise.all([
      Promise.resolve(this.tenantProvisioningService.listAvailableModules()),
      this.featureFlagsService.listForTenant(id),
    ]);

    return availableModules.map((mod) => ({
      ...mod,
      enabled: enabledByKey.get(mod.key) ?? false,
    }));
  }

  @Patch(':id/features')
  @ApiOkResponse({ description: 'Enables or disables a tenant feature.' })
  async updateTenantFeature(
    @CurrentTenant() current: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTenantFeatureDto,
  ) {
    if (dto.enabled) {
      await this.tenantProvisioningService.applyFeatureMigrations(
        id,
        dto.featureKey,
      );
    }
    await this.featureFlagsService.setEnabled(
      id,
      dto.featureKey,
      dto.enabled,
      current.userId,
    );
    return { ok: true };
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Deletes a tenant and its tenant schema.' })
  async deleteTenant(@Param('id') id: string) {
    await this.tenantProvisioningService.deleteTenant(id);
    return { ok: true };
  }

  @Get(':id/audit-logs')
  @ApiOkResponse({ description: 'Lists audit logs for a specific tenant.' })
  listTenantAuditLogs(
    @Param('id') id: string,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogService.list({
      tenantId: id,
      userId: query.userId,
      action: query.action,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
