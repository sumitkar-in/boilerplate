import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { BpqlRowDto } from './dto/bpql-row.dto';
import { CreateBpqlChartDto } from './dto/create-bpql-chart.dto';
import { CreateBpqlSavedQueryDto } from './dto/create-bpql-saved-query.dto';
import { CreateBpqlTableDto } from './dto/create-bpql-table.dto';
import { QueryBpqlRowsDto } from './dto/query-bpql-rows.dto';
import { RunBpqlAggregateQueryDto } from './dto/run-bpql-aggregate-query.dto';
import { RunBpqlQueryDto } from './dto/run-bpql-query.dto';
import { UpdateBpqlChartDto } from './dto/update-bpql-chart.dto';
import { UpdateBpqlSavedQueryDto } from './dto/update-bpql-saved-query.dto';
import { UpdateBpqlTableDto } from './dto/update-bpql-table.dto';
import type { BpqlChartPlacement } from './entities/bpql-chart';
import { BpqlService } from './bpql.service';

@TenantModuleController('bpql')
export class BpqlController {
  constructor(private readonly bpqlService: BpqlService) {}

  @Get('tables')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Lists tenant BPQL custom tables.' })
  listTables(@CurrentTenant() tenant: TenantContext) {
    return this.bpqlService.listTables(tenant);
  }

  @Post('tables')
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a tenant BPQL custom table.' })
  createTable(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateBpqlTableDto,
  ) {
    return this.bpqlService.createTable(tenant, dto);
  }

  @Post('query')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Runs a tenant-scoped BPQL JSON query.' })
  runQuery(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: RunBpqlQueryDto,
  ) {
    return this.bpqlService.runQuery(tenant, dto);
  }

  @Get('tables/:slug')
  @Permissions('modules:read')
  findTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
  ) {
    return this.bpqlService.findTable(tenant, slug);
  }

  @Patch('tables/:slug')
  @Permissions('modules:update')
  updateTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
    @Body() dto: UpdateBpqlTableDto,
  ) {
    return this.bpqlService.updateTable(tenant, slug, dto);
  }

  @Delete('tables/:slug')
  @Permissions('modules:delete')
  removeTable(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
  ) {
    return this.bpqlService.removeTable(tenant, slug);
  }

  @Get('tables/:slug/rows')
  @Permissions('modules:read')
  listRows(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
    @Query() query: QueryBpqlRowsDto,
  ) {
    return this.bpqlService.listRows(tenant, slug, query);
  }

  @Post('tables/:slug/rows')
  @Permissions('modules:create')
  createRow(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
    @Body() dto: BpqlRowDto,
  ) {
    return this.bpqlService.createRow(tenant, slug, dto);
  }

  @Patch('tables/:slug/rows/:rowId')
  @Permissions('modules:update')
  updateRow(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
    @Param('rowId') rowId: string,
    @Body() dto: BpqlRowDto,
  ) {
    return this.bpqlService.updateRow(tenant, slug, rowId, dto);
  }

  @Delete('tables/:slug/rows/:rowId')
  @Permissions('modules:delete')
  removeRow(
    @CurrentTenant() tenant: TenantContext,
    @Param('slug') slug: string,
    @Param('rowId') rowId: string,
  ) {
    return this.bpqlService.removeRow(tenant, slug, rowId);
  }

  // --- saved queries ---

  @Get('queries')
  @Permissions('modules:read')
  @ApiOkResponse({
    description: 'Lists saved BPQL queries, optionally for one table.',
  })
  listSavedQueries(
    @CurrentTenant() tenant: TenantContext,
    @Query('table') table?: string,
  ) {
    return this.bpqlService.listSavedQueries(tenant, table);
  }

  @Post('queries')
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Saves a reusable BPQL query.' })
  createSavedQuery(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateBpqlSavedQueryDto,
  ) {
    return this.bpqlService.createSavedQuery(tenant, dto);
  }

  @Patch('queries/:id')
  @Permissions('modules:update')
  updateSavedQuery(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBpqlSavedQueryDto,
  ) {
    return this.bpqlService.updateSavedQuery(tenant, id, dto);
  }

  @Delete('queries/:id')
  @Permissions('modules:delete')
  deleteSavedQuery(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.bpqlService.deleteSavedQuery(tenant, id);
  }

  // --- charts ---

  @Get('charts')
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Lists saved BPQL charts, optionally filtered by placement/table.',
  })
  listCharts(
    @CurrentTenant() tenant: TenantContext,
    @Query('placement') placement?: BpqlChartPlacement,
    @Query('table') table?: string,
  ) {
    return this.bpqlService.listCharts(tenant, { placement, table });
  }

  @Post('charts')
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a BPQL chart/card.' })
  createChart(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateBpqlChartDto,
  ) {
    return this.bpqlService.createChart(tenant, dto);
  }

  @Patch('charts/:id')
  @Permissions('modules:update')
  updateChart(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBpqlChartDto,
  ) {
    return this.bpqlService.updateChart(tenant, id, dto);
  }

  @Delete('charts/:id')
  @Permissions('modules:delete')
  deleteChart(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.bpqlService.deleteChart(tenant, id);
  }

  @Get('charts/:id/data')
  @Permissions('modules:read')
  @ApiOkResponse({
    description: 'Executes a saved chart and returns its aggregated data.',
  })
  getChartData(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.bpqlService.getChartData(tenant, id);
  }

  @Post('query/aggregate')
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Runs an ad hoc group-by/aggregate query (chart-builder preview).',
  })
  runAggregateQuery(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: RunBpqlAggregateQueryDto,
  ) {
    return this.bpqlService.runAggregateQuery(tenant, dto);
  }
}
