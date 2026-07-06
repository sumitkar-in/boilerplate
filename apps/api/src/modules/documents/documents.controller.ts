import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { CreateDocumentCommentDto } from './dto/create-document-comment.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { QueryPagesDto } from './dto/query-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { DocumentsService } from './documents.service';

@TenantModuleController('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('spaces')
  @Permissions('modules:read')
  listSpaces(@CurrentTenant() tenant: TenantContext) {
    return this.documentsService.listSpaces(tenant);
  }

  @Post('spaces')
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a documentation space.' })
  createSpace(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateSpaceDto,
  ) {
    return this.documentsService.createSpace(tenant, dto);
  }

  @Patch('spaces/:id')
  @Permissions('modules:update')
  updateSpace(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.documentsService.updateSpace(tenant, id, dto);
  }

  @Get('pages')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Lists documentation pages.' })
  listPages(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: QueryPagesDto,
  ) {
    return this.documentsService.listPages(tenant, query);
  }

  @Post('pages')
  @Permissions('modules:create')
  createPage(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreatePageDto,
  ) {
    return this.documentsService.createPage(tenant, dto);
  }

  @Get('pages/:id')
  @Permissions('modules:read')
  findPage(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.documentsService.findPage(tenant, id);
  }

  @Patch('pages/:id')
  @Permissions('modules:update')
  updatePage(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.documentsService.updatePage(tenant, id, dto);
  }

  @Delete('pages/:id')
  @Permissions('modules:delete')
  removePage(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.documentsService.removePage(tenant, id);
  }

  @Post('pages/:id/comments')
  @Permissions('modules:update')
  addComment(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateDocumentCommentDto,
  ) {
    return this.documentsService.addComment(tenant, id, dto);
  }

  @Post('pages/:pageId/revisions/:revisionId/restore')
  @Permissions('modules:update')
  restoreRevision(
    @CurrentTenant() tenant: TenantContext,
    @Param('pageId') pageId: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.documentsService.restoreRevision(tenant, pageId, revisionId);
  }
}
