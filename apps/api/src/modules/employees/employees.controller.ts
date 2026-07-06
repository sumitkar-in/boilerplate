import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ExportEmployeesDto } from './dto/export-employees.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeCsvService } from './employee-csv.service';
import { EmployeeCustomFieldsService } from './employee-custom-fields.service';
import { EmployeesService } from './employees.service';

@TenantModuleController('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly customFieldsService: EmployeeCustomFieldsService,
    private readonly csvService: EmployeeCsvService,
  ) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Lists employees with search, filters, sorting, and pagination.',
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryEmployeesDto,
  ) {
    return this.employeesService.findAll(tenant, query);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates an employee.' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(tenant, dto);
  }

  // CSV export/import runs async in the worker process — these endpoints
  // enqueue jobs and report status. Declared before ':id' like the
  // custom-field routes below.
  @Post('export')
  @Permissions('modules:read')
  @ApiCreatedResponse({
    description:
      'Enqueues a CSV export of all matching employees; returns a job id.',
  })
  exportCsv(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ExportEmployeesDto,
  ) {
    return this.csvService.enqueueExport(tenant, dto);
  }

  @Post('import')
  @Permissions('modules:create')
  @ApiCreatedResponse({
    description: 'Enqueues a CSV import; returns a job id.',
  })
  importCsv(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: ImportEmployeesDto,
  ) {
    return this.csvService.enqueueImport(tenant, dto.csv);
  }

  @Get('jobs/:jobId')
  @Permissions('modules:read')
  @ApiOkResponse({
    description: 'Returns the state, progress, and result of a CSV job.',
  })
  getJob(
    @CurrentTenant() tenant: TenantContext,
    @Param('jobId') jobId: string,
  ) {
    return this.csvService.getStatus(tenant, jobId);
  }

  @Get('jobs/:jobId/download')
  @Permissions('modules:read')
  @ApiOkResponse({
    description: 'Downloads the CSV file produced by a completed export job.',
  })
  async downloadExport(
    @CurrentTenant() tenant: TenantContext,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.csvService.getExportDownload(
      tenant,
      jobId,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  // Custom-field routes are declared before ':id' so "custom-fields" is
  // never captured as an employee id.
  @Get('custom-fields')
  @Permissions('modules:read')
  @ApiOkResponse({
    description: 'Lists the tenant-defined custom fields for employees.',
  })
  listCustomFields(@CurrentTenant() tenant: TenantContext) {
    return this.customFieldsService.findAll(tenant);
  }

  @Post('custom-fields')
  @Permissions('modules:update')
  @ApiCreatedResponse({ description: 'Defines a new custom field.' })
  createCustomField(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.create(tenant, dto);
  }

  @Patch('custom-fields/:id')
  @Permissions('modules:update')
  @ApiOkResponse({ description: 'Updates a custom field definition.' })
  updateCustomField(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.customFieldsService.update(tenant, id, dto);
  }

  @Delete('custom-fields/:id')
  @Permissions('modules:update')
  @ApiOkResponse({
    description: 'Deletes a custom field definition and its stored values.',
  })
  removeCustomField(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.customFieldsService.remove(tenant, id);
  }

  @Get(':id')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Returns an employee by id.' })
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.employeesService.findOne(tenant, id);
  }

  @Patch(':id')
  @Permissions('modules:update')
  @ApiOkResponse({ description: 'Updates an employee.' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  @ApiOkResponse({ description: 'Deletes an employee.' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.employeesService.remove(tenant, id);
  }
}
