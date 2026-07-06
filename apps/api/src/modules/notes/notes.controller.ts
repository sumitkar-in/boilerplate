import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateNoteDto } from './dto/create-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@TenantModuleController('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({
    description:
      'Lists notes with search, status/pinned/label filters, sorting, and pagination.',
  })
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryNotesDto,
  ) {
    return this.notesService.findAll(tenant, query);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a Note.' })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateNoteDto) {
    return this.notesService.create(tenant, dto);
  }

  @Get(':id')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Returns a Note by id.' })
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.notesService.findOne(tenant, id);
  }

  @Patch(':id')
  @Permissions('modules:update')
  @ApiOkResponse({ description: 'Updates a Note.' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  @ApiOkResponse({ description: 'Deletes a Note.' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.notesService.remove(tenant, id);
  }
}
