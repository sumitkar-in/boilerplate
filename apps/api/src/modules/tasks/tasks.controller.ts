import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskCustomFieldDto } from './dto/create-task-custom-field.dto';
import { CreateTaskProjectDto } from './dto/create-task-project.dto';
import { CreateTaskSprintDto } from './dto/create-task-sprint.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskCustomFieldDto } from './dto/update-task-custom-field.dto';
import { UpdateTaskProjectDto } from './dto/update-task-project.dto';
import { UpdateTaskSprintDto } from './dto/update-task-sprint.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@TenantModuleController('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({
    description: 'Lists tasks with search, filters, sorting, and pagination.',
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findAll(tenant, query);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a task.' })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(tenant, dto);
  }

  @Get('projects')
  @Permissions('modules:read')
  listProjects(@CurrentTenant() tenant: TenantContext) {
    return this.tasksService.listProjects(tenant);
  }

  @Post('projects')
  @Permissions('modules:update')
  createProject(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTaskProjectDto,
  ) {
    return this.tasksService.createProject(tenant, dto);
  }

  @Patch('projects/:id')
  @Permissions('modules:update')
  updateProject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTaskProjectDto,
  ) {
    return this.tasksService.updateProject(tenant, id, dto);
  }

  @Get('sprints')
  @Permissions('modules:read')
  listSprints(
    @CurrentTenant() tenant: TenantContext,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.listSprints(tenant, projectId);
  }

  @Post('sprints')
  @Permissions('modules:update')
  createSprint(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTaskSprintDto,
  ) {
    return this.tasksService.createSprint(tenant, dto);
  }

  @Patch('sprints/:id')
  @Permissions('modules:update')
  updateSprint(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTaskSprintDto,
  ) {
    return this.tasksService.updateSprint(tenant, id, dto);
  }

  @Delete('sprints/:id')
  @Permissions('modules:update')
  removeSprint(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.tasksService.removeSprint(tenant, id);
  }

  @Get('custom-fields')
  @Permissions('modules:read')
  listCustomFields(
    @CurrentTenant() tenant: TenantContext,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.listCustomFields(tenant, projectId);
  }

  @Post('custom-fields')
  @Permissions('modules:update')
  createCustomField(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateTaskCustomFieldDto,
  ) {
    return this.tasksService.createCustomField(tenant, dto);
  }

  @Patch('custom-fields/:id')
  @Permissions('modules:update')
  updateCustomField(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTaskCustomFieldDto,
  ) {
    return this.tasksService.updateCustomField(tenant, id, dto);
  }

  @Delete('custom-fields/:id')
  @Permissions('modules:update')
  removeCustomField(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.tasksService.removeCustomField(tenant, id);
  }

  @Get('by-key/:taskKey')
  @Permissions('modules:read')
  findByKey(
    @CurrentTenant() tenant: TenantContext,
    @Param('taskKey') taskKey: string,
  ) {
    return this.tasksService.findByKey(tenant, taskKey);
  }

  @Get(':id')
  @Permissions('modules:read')
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.tasksService.findOne(tenant, id);
  }

  @Patch(':id')
  @Permissions('modules:update')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.tasksService.remove(tenant, id);
  }

  @Post(':id/comments')
  @Permissions('modules:update')
  addComment(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateTaskCommentDto,
  ) {
    return this.tasksService.addComment(tenant, id, dto);
  }
}
