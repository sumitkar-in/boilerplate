import { Body, Delete, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { KnowledgeChatDto } from './dto/chat.dto';
import { CreateKnowledgeSkillDto } from './dto/create-knowledge-skill.dto';
import { CreateKnowledgeSourceDto } from './dto/create-knowledge-source.dto';
import { KnowledgeBotService } from './knowledge-bot.service';

@TenantModuleController('knowledge-bot')
export class KnowledgeBotController {
  constructor(private readonly knowledgeBotService: KnowledgeBotService) {}

  @Get('sources')
  @Permissions('modules:read')
  listSources(@CurrentTenant() tenant: TenantContext) {
    return this.knowledgeBotService.listSources(tenant);
  }

  @Post('sources')
  @Permissions('modules:create')
  createSource(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateKnowledgeSourceDto,
  ) {
    return this.knowledgeBotService.createSource(tenant, dto);
  }

  @Delete('sources/:id')
  @Permissions('modules:delete')
  removeSource(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.knowledgeBotService.removeSource(tenant, id);
  }

  @Get('skills')
  @Permissions('modules:read')
  listSkills(@CurrentTenant() tenant: TenantContext) {
    return this.knowledgeBotService.listSkills(tenant);
  }

  @Post('skills')
  @Permissions('modules:create')
  createSkill(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateKnowledgeSkillDto,
  ) {
    return this.knowledgeBotService.createSkill(tenant, dto);
  }

  @Delete('skills/:id')
  @Permissions('modules:delete')
  removeSkill(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.knowledgeBotService.removeSkill(tenant, id);
  }

  @Get('messages')
  @Permissions('modules:read')
  listMessages(@CurrentTenant() tenant: TenantContext) {
    return this.knowledgeBotService.listMessages(tenant);
  }

  @Get('models')
  @Permissions('modules:read')
  async listModels() {
    return { models: await this.knowledgeBotService.listModels() };
  }

  @Post('chat')
  @Permissions('modules:create')
  chat(@CurrentTenant() tenant: TenantContext, @Body() dto: KnowledgeChatDto) {
    return this.knowledgeBotService.chat(tenant, dto);
  }

  // SSE — the controller owns the raw response since we're proxying an
  // upstream stream from the Python service rather than emitting our own
  // Observable (which is what Nest's @Sse() decorator expects instead).
  @Post('chat/stream')
  @Permissions('modules:create')
  chatStream(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: KnowledgeChatDto,
    @Res() res: Response,
  ) {
    return this.knowledgeBotService.chatStream(tenant, dto, res);
  }
}
