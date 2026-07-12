import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import { ListQueryDto } from '../../core/common/query/list-query.dto';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { VisitorService } from './visitors.service';

@TenantModuleController('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Lists Visitors with search, filters, sorting, and pagination.',
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListQueryDto,
  ) {
    return this.visitorService.findAll(tenant, query);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a Visitor.' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateVisitorDto,
  ) {
    return this.visitorService.create(tenant, dto);
  }

  @Get(':id')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Returns a Visitor by id.' })
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.visitorService.findOne(tenant, id);
  }

  @Patch(':id')
  @Permissions('modules:update')
  @ApiOkResponse({ description: 'Updates a Visitor.' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateVisitorDto,
  ) {
    return this.visitorService.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  @ApiOkResponse({ description: 'Deletes a Visitor.' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.visitorService.remove(tenant, id);
  }
}
