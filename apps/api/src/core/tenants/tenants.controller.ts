import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../common/audit-log.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { ResolvedTenantIdentity } from '../common/decorators/resolved-tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateTenantRoleDto } from './dto/create-tenant-role.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberRoleKeyDto } from './dto/update-member-role-key.dto';
import type { TenantContext } from './tenant-context';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { UpdateTenantRoleDto } from './dto/update-tenant-role.dto';
import { MembershipsService } from './memberships.service';
import { MenuPreferencesService } from './menu-preferences.service';
import { TenantRolesService } from './tenant-roles.service';
import { TenantsService } from './tenants.service';

// No tenant-creation endpoint here by design — tenants are provisioned via
// the CLI (`pnpm tenant:create`), not a public/admin API. See:
// scripts/database/create-tenant.js
@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly tenantRolesService: TenantRolesService,
    private readonly menuPreferencesService: MenuPreferencesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Public()
  @Get('branding')
  @ApiOkResponse({
    description:
      'Returns public branding (company name, brand color, logo) for the tenant resolved from the x-tenant-id header/subdomain. Used to brand the pre-auth login screen.',
  })
  async getPublicBranding(
    @Req()
    request: Request & { resolvedTenant?: ResolvedTenantIdentity },
    @Query('slug') slug: string | undefined,
    @Res() response: Response,
  ) {
    const requestedSlug = slug?.trim();
    if (requestedSlug) {
      const branding =
        await this.tenantsService.getPublicBrandingBySlug(requestedSlug);
      return response.json(branding);
    }
    if (!request.resolvedTenant) return response.json(null);
    const branding = await this.tenantsService.getPublicBranding(
      request.resolvedTenant.tenantId,
    );
    return response.json(branding);
  }

  @Get('me')
  @ApiOkResponse({ description: 'Returns the current tenant context.' })
  getCurrentTenant(@CurrentTenant() tenant: TenantContext) {
    return {
      tenantId: tenant.tenantId,
      tenantSlug: tenant.tenantSlug,
      role: tenant.role,
    };
  }

  @Roles('admin')
  @Get('settings')
  @ApiOkResponse({
    description: 'Returns branding settings for the current tenant.',
  })
  getSettings(@CurrentTenant() tenant: TenantContext) {
    return this.tenantsService.getSettings(tenant.tenantId);
  }

  @Roles('admin')
  @Patch('settings')
  @ApiOkResponse({
    description: 'Updates branding settings for the current tenant.',
  })
  updateSettings(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantsService.updateSettings(tenant.tenantId, dto);
  }

  @Roles('admin')
  @Get('audit-logs')
  @ApiOkResponse({
    description: 'Lists recent audit logs for the current tenant.',
  })
  listAuditLogs(@CurrentTenant() tenant: TenantContext) {
    return this.auditLogService.listForTenant(tenant.tenantId);
  }

  @Roles('admin')
  @Permissions('tenant:members:read')
  @Get('members')
  @ApiOkResponse({
    description:
      'Lists members in the current tenant with search, status filter, sorting, and pagination.',
  })
  listMembers(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryMembersDto,
  ) {
    return this.membershipsService.listMembers(tenant.tenantId, query);
  }

  @Get('menu-order')
  @ApiOkResponse({ description: 'Returns the effective menu order.' })
  async getMenuOrder(@CurrentTenant() tenant: TenantContext) {
    return {
      itemOrder: await this.menuPreferencesService.getMenuOrder(
        tenant.tenantId,
      ),
    };
  }

  @Roles('owner')
  @Patch('menu-order')
  @ApiOkResponse({
    description:
      'Updates menu order for the current tenant using only available menu options.',
  })
  updateMenuOrder(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: UpdateMenuOrderDto,
  ) {
    return this.menuPreferencesService.updateTenantMenuOrder(
      tenant.tenantId,
      dto.itemOrder,
      tenant.userId,
    );
  }

  @Roles('admin')
  @Permissions('tenant:members:update')
  @Patch('members/:userId')
  @ApiOkResponse({ description: 'Updates a tenant member role.' })
  async updateMemberRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    await this.membershipsService.updateMemberRole(
      tenant.tenantId,
      userId,
      dto.role,
    );
    return { ok: true };
  }

  @Roles('owner')
  @Permissions('tenant:members:update')
  @Patch('members/:userId/role')
  @ApiOkResponse({ description: 'Assigns a custom tenant role to a member.' })
  async updateMemberRoleKey(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleKeyDto,
  ) {
    await this.membershipsService.updateMemberRoleKey(
      tenant.tenantId,
      userId,
      dto.roleKey,
    );
    return { ok: true };
  }

  @Roles('admin')
  @Permissions('tenant:members:delete')
  @Delete('members/:userId')
  @ApiOkResponse({ description: 'Removes a tenant member.' })
  async removeMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId') userId: string,
  ) {
    await this.membershipsService.removeMember(tenant.tenantId, userId);
    return { ok: true };
  }

  @Roles('owner')
  @Permissions('tenant:roles:read')
  @Get('roles')
  @ApiOkResponse({ description: 'Lists custom RBAC roles for the tenant.' })
  listRoles(@CurrentTenant() tenant: TenantContext) {
    return this.tenantRolesService.listRoles(tenant.tenantId);
  }

  @Roles('owner')
  @Permissions('tenant:roles:create')
  @Post('roles')
  @ApiOkResponse({ description: 'Creates a custom tenant role.' })
  createRole(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTenantRoleDto,
  ) {
    return this.tenantRolesService.createRole(tenant.tenantId, dto);
  }

  @Roles('owner')
  @Permissions('tenant:roles:update')
  @Patch('roles/:key')
  @ApiOkResponse({ description: 'Updates a tenant role.' })
  updateRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('key') key: string,
    @Body() dto: UpdateTenantRoleDto,
  ) {
    return this.tenantRolesService.updateRole(tenant.tenantId, key, dto);
  }

  @Roles('owner')
  @Permissions('tenant:roles:delete')
  @Delete('roles/:key')
  @ApiOkResponse({ description: 'Deletes a non-system custom tenant role.' })
  async deleteRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('key') key: string,
  ) {
    await this.tenantRolesService.deleteRole(tenant.tenantId, key);
    return { ok: true };
  }
}
