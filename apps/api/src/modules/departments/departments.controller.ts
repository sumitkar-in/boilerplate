import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import { ListQueryDto } from '../../core/common/query/list-query.dto';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@TenantModuleController('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Lists departments with search, filters, sorting, and pagination.',
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListQueryDto,
  ) {
    return this.departmentsService.findAll(tenant, query);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a department.' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(tenant, dto);
  }

  @Get(':id')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Returns a department by id.' })
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.departmentsService.findOne(tenant, id);
  }

  @Patch(':id')
  @Permissions('modules:update')
  @ApiOkResponse({ description: 'Updates a department.' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  @ApiOkResponse({ description: 'Deletes a department.' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.departmentsService.remove(tenant, id);
  }
}
