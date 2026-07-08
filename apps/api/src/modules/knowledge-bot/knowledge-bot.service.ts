import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { Response } from 'express';
import { assertFound } from '../../core/common/crud/crud.helpers';
import { aiConfig, type AiConfig } from '../../core/config';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { KnowledgeChatDto } from './dto/chat.dto';
import { CreateKnowledgeSkillDto } from './dto/create-knowledge-skill.dto';
import { CreateKnowledgeSourceDto } from './dto/create-knowledge-source.dto';
import { knowledgeChatMessage } from './entities/knowledge-chat-message';
import { knowledgeSkill } from './entities/knowledge-skill';
import { knowledgeSource } from './entities/knowledge-source';

type AiChatResponse = {
  answer: string;
  model: string;
  citations: Array<Record<string, string>>;
};

// One SSE frame from the Python service's /v1/chat/stream — see
// apps/ai/knowledge_ai/models.py's ChatStreamChunk.
type AiChatStreamChunk = {
  delta: string;
  done: boolean;
  model?: string | null;
  citations?: Array<Record<string, string>>;
  error?: boolean;
};

const AI_STREAM_TIMEOUT_MS = 30_000;

@Injectable()
export class KnowledgeBotService {
  private readonly logger = new Logger(KnowledgeBotService.name);

  constructor(
    private readonly tenantDb: TenantDbService,
    @Inject(aiConfig.KEY) private readonly ai: AiConfig,
  ) {}

  listSources(tenant: TenantContext) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .select()
        .from(knowledgeSource)
        .orderBy(desc(knowledgeSource.updatedAt)),
    );
  }

  async createSource(tenant: TenantContext, dto: CreateKnowledgeSourceDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(knowledgeSource)
        .values({
          name: dto.name.trim(),
          kind: dto.kind,
          content: dto.content ?? '',
          metadata: dto.metadata ?? {},
          createdBy: tenant.userId,
        })
        .returning(),
    );
    await this.syncToAi('/v1/sources', {
      tenant: this.toAiTenant(tenant),
      source: row,
    });
    return row;
  }

  async removeSource(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(knowledgeSource)
        .where(eq(knowledgeSource.id, id))
        .returning({ id: knowledgeSource.id }),
    );
    assertFound(row, 'Knowledge source');
    // Sources are also mirrored into the AI service's own retrieval index
    // (see createSource's syncToAi call) — without this, a deleted source
    // keeps showing up in search citations forever since Postgres and the
    // AI service's store are separate.
    await this.syncToAi('/v1/sources/remove', {
      tenant: this.toAiTenant(tenant),
      id,
    });
    return { ok: true };
  }

  listSkills(tenant: TenantContext) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      db.select().from(knowledgeSkill).orderBy(desc(knowledgeSkill.updatedAt)),
    );
  }

  async createSkill(tenant: TenantContext, dto: CreateKnowledgeSkillDto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(knowledgeSkill)
        .values({
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          instruction: dto.instruction?.trim() ?? '',
          enabled: dto.enabled ?? true,
          createdBy: tenant.userId,
        })
        .returning(),
    );
    await this.syncToAi('/v1/skills', {
      tenant: this.toAiTenant(tenant),
      skill: row,
    });
    return row;
  }

  async removeSkill(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .delete(knowledgeSkill)
        .where(eq(knowledgeSkill.id, id))
        .returning({ id: knowledgeSkill.id }),
    );
    assertFound(row, 'Knowledge skill');
    await this.syncToAi('/v1/skills/remove', {
      tenant: this.toAiTenant(tenant),
      id,
    });
    return { ok: true };
  }

  async listModels(): Promise<string[]> {
    if (!this.ai.enabled) return [];
    try {
      const response = await this.getAi<{ models: string[] }>('/v1/models');
      this.logger.log(`listModels: found ${response.models.length} model(s)`);
      return response.models;
    } catch (err) {
      // Model listing is a nice-to-have for the chat UI's dropdown — if the
      // AI service or Ollama is unreachable, fall back to an empty list
      // (the frontend just falls back to free text) instead of failing.
      this.logger.error('Could not list AI models', err);
      return [];
    }
  }

  listMessages(tenant: TenantContext) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .select()
        .from(knowledgeChatMessage)
        .orderBy(desc(knowledgeChatMessage.createdAt))
        .limit(100),
    );
  }

  async chat(tenant: TenantContext, dto: KnowledgeChatDto) {
    const startedAt = Date.now();
    this.logger.log(
      `chat: tenant=${tenant.tenantSlug} model=${dto.model ?? 'default'} aiEnabled=${this.ai.enabled}`,
    );
    const history = await this.recordUserMessage(tenant, dto.message);

    if (!this.ai.enabled) {
      this.logger.log(
        `chat: tenant=${tenant.tenantSlug} using local fallback (AI disabled)`,
      );
      return this.chatWithLocalFallback(tenant);
    }

    const response = await this.postAi<AiChatResponse>('/v1/chat', {
      tenant: this.toAiTenant(tenant),
      message: dto.message,
      history,
      model: dto.model,
    });

    const assistantMessage = await this.recordAssistantMessage(tenant, {
      content: response.answer,
      model: response.model,
      citations: response.citations,
    });
    this.logger.log(
      `chat: tenant=${tenant.tenantSlug} model=${response.model} completed in ${Date.now() - startedAt}ms`,
    );
    return { ...assistantMessage, answer: response.answer };
  }

  /**
   * Streams the answer to the client as SSE while it's generated, then
   * persists the completed assistant message once the upstream stream
   * closes — same DB write as chat(), just deferred until all chunks
   * have been forwarded instead of the sole write happening up front.
   * The controller owns the raw Express response (@Res({ passthrough:
   * false })) since Nest's @Sse() decorator expects an Observable, not a
   * proxied upstream fetch stream.
   */
  async chatStream(
    tenant: TenantContext,
    dto: KnowledgeChatDto,
    res: Response,
  ): Promise<void> {
    const startedAt = Date.now();
    this.logger.log(
      `chatStream: tenant=${tenant.tenantSlug} model=${dto.model ?? 'default'} aiEnabled=${this.ai.enabled}`,
    );
    const history = await this.recordUserMessage(tenant, dto.message);

    this.openSse(res);

    if (!this.ai.enabled) {
      this.logger.log(
        `chatStream: tenant=${tenant.tenantSlug} using local fallback (AI disabled)`,
      );
      await this.streamLocalFallback(tenant, dto, res);
      return;
    }

    this.writeSse(res, {
      delta: '',
      done: false,
      model: dto.model ?? 'pending',
    });

    let fullAnswer = '';
    let finalModel = dto.model ?? '';
    let finalCitations: Array<Record<string, string>> = [];
    const decoder = new TextDecoder();
    let buffer = '';
    let streamFailed = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const processFrame = (frame: string) => {
      const line = frame.trim();
      if (!line.startsWith('data:')) return;
      const data = line.slice('data:'.length).trim();
      res.write(`${frame}\n\n`);
      if (data === '[DONE]') return;

      const chunk = JSON.parse(data) as AiChatStreamChunk;
      fullAnswer += chunk.delta;
      if (chunk.done) {
        finalModel = chunk.model ?? finalModel;
        finalCitations = chunk.citations ?? [];
      }
    };
    try {
      const upstream = await this.fetchAiStream(tenant, dto, history);
      if (!upstream.ok || !upstream.body) {
        throw new ServiceUnavailableException(
          `AI service request failed (${upstream.status})`,
        );
      }

      const streamReader = upstream.body.getReader();
      reader = streamReader;
      for (;;) {
        const { value, done } = await streamReader.read();
        if (done) break;
        buffer += decoder
          .decode(value, { stream: true })
          .replace(/\r\n/g, '\n');

        // SSE frames are separated by a blank line; process each complete
        // frame as it arrives and leave any partial trailing frame in the
        // buffer for the next chunk.
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          processFrame(frame);
        }
      }
      buffer += decoder.decode().replace(/\r\n/g, '\n');
      if (buffer.trim()) processFrame(buffer);
    } catch (err) {
      streamFailed = true;
      this.logger.error(
        `chatStream: tenant=${tenant.tenantSlug} failed after ${Date.now() - startedAt}ms`,
        err,
      );
      this.writeStreamError(
        res,
        finalModel || dto.model || 'unknown',
        finalCitations,
      );
      res.write('data: [DONE]\n\n');
    } finally {
      reader?.releaseLock();
    }

    if (!streamFailed) {
      try {
        await this.recordAssistantMessage(tenant, {
          content: fullAnswer,
          model: finalModel,
          citations: finalCitations,
        });
        this.logger.log(
          `chatStream: tenant=${tenant.tenantSlug} model=${finalModel} completed in ${Date.now() - startedAt}ms (${fullAnswer.length} chars)`,
        );
      } catch (err) {
        // The client already received the full streamed answer — a failure
        // to persist it shouldn't surface as a broken response, just get
        // logged so history is known to be incomplete for this exchange.
        this.logger.error('Failed to persist streamed assistant message', err);
      }
    }
    res.end();
  }

  private async recordUserMessage(tenant: TenantContext, message: string) {
    return this.tenantDb.withTenantDb(tenant, async (db) => {
      const rows = await db
        .select({
          role: knowledgeChatMessage.role,
          content: knowledgeChatMessage.content,
        })
        .from(knowledgeChatMessage)
        .orderBy(desc(knowledgeChatMessage.createdAt))
        .limit(12);
      await db.insert(knowledgeChatMessage).values({
        role: 'user',
        content: message,
        createdBy: tenant.userId,
      });
      return rows.reverse();
    });
  }

  private async recordAssistantMessage(
    tenant: TenantContext,
    input: {
      content: string;
      model: string;
      citations: Array<Record<string, string>>;
    },
  ) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .insert(knowledgeChatMessage)
        .values({
          role: 'assistant',
          content: input.content,
          model: input.model,
          citations: input.citations,
          createdBy: tenant.userId,
        })
        .returning(),
    );
    return row;
  }

  private async syncToAi(path: string, body: unknown): Promise<void> {
    if (!this.ai.enabled) return;
    await this.postAi(path, body);
  }

  private async chatWithLocalFallback(tenant: TenantContext) {
    const answer = this.localFallbackAnswer();
    const assistantMessage = await this.recordAssistantMessage(tenant, {
      content: answer,
      model: 'local-fallback',
      citations: [],
    });
    return { ...assistantMessage, answer };
  }

  private async streamLocalFallback(
    tenant: TenantContext,
    _dto: KnowledgeChatDto,
    res: Response,
  ): Promise<void> {
    const answer = this.localFallbackAnswer();
    const model = 'local-fallback';

    this.writeSse(res, { delta: answer, done: true, model, citations: [] });
    res.write('data: [DONE]\n\n');

    await this.recordAssistantMessage(tenant, {
      content: answer,
      model,
      citations: [],
    });
    res.end();
  }

  private localFallbackAnswer(): string {
    return 'Knowledge bot local mode is active because AI is disabled. Your message was saved, but generated answers require setup.sh --enable-ai and AI_ENABLED=true.';
  }

  private openSse(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    res.flushHeaders?.();
  }

  private writeSse(res: Response, chunk: AiChatStreamChunk): void {
    // lgtm[js/reflected-xss] SSE frames are served as text/event-stream with nosniff and JSON HTML-sensitive chars escaped.
    res.write(formatSseJsonFrame(chunk));
  }

  private writeStreamError(
    res: Response,
    model: string,
    citations: Array<Record<string, string>>,
  ): void {
    this.writeSse(res, {
      delta:
        '\n\nAI response stream failed before completion. Check AI_SERVICE_URL, AI_ENABLED, and the Ollama service.',
      done: true,
      model,
      citations,
      error: true,
    });
  }

  private fetchAiStream(
    tenant: TenantContext,
    dto: KnowledgeChatDto,
    history: unknown,
  ): Promise<globalThis.Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_STREAM_TIMEOUT_MS);
    return fetch(`${this.ai.serviceUrl}/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tenant: this.toAiTenant(tenant),
        message: dto.message,
        history,
        model: dto.model,
      }),
    }).finally(() => clearTimeout(timeout));
  }

  private async postAi<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.ai.serviceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `AI service request failed (${response.status})`,
      );
    }
    return (await response.json()) as T;
  }

  private async getAi<T>(path: string): Promise<T> {
    const response = await fetch(`${this.ai.serviceUrl}${path}`);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `AI service request failed (${response.status})`,
      );
    }
    return (await response.json()) as T;
  }

  private toAiTenant(tenant: TenantContext) {
    return {
      id: tenant.tenantId,
      slug: tenant.tenantSlug,
      schemaName: tenant.schemaName,
    };
  }
}

function formatSseJsonFrame(chunk: AiChatStreamChunk): string {
  const json = JSON.stringify(chunk)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  return `data: ${json}\n\n`;
}
