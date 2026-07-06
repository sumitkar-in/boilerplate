import { apiFetch, apiFetchStream } from '../../../core/api-client';

export type KnowledgeSourceKind = 'text' | 'url' | 'file' | 'database' | 'api';

export type KnowledgeSource = {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSkill = {
  id: string;
  name: string;
  description: string;
  instruction: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  citations: Array<Record<string, string>>;
  createdAt: string;
};

export function listKnowledgeSources(): Promise<KnowledgeSource[]> {
  return apiFetch<KnowledgeSource[]>('/knowledge-bot/sources');
}

export function createKnowledgeSource(input: {
  name: string;
  kind: KnowledgeSourceKind;
  content?: string;
  metadata?: Record<string, unknown>;
}): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>('/knowledge-bot/sources', { method: 'POST', body: input });
}

export function deleteKnowledgeSource(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/knowledge-bot/sources/${id}`, { method: 'DELETE' });
}

export function listKnowledgeSkills(): Promise<KnowledgeSkill[]> {
  return apiFetch<KnowledgeSkill[]>('/knowledge-bot/skills');
}

export function createKnowledgeSkill(input: {
  name: string;
  description?: string;
  instruction?: string;
  enabled?: boolean;
}): Promise<KnowledgeSkill> {
  return apiFetch<KnowledgeSkill>('/knowledge-bot/skills', { method: 'POST', body: input });
}

export function deleteKnowledgeSkill(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/knowledge-bot/skills/${id}`, { method: 'DELETE' });
}

export function listKnowledgeMessages(): Promise<KnowledgeMessage[]> {
  return apiFetch<KnowledgeMessage[]>('/knowledge-bot/messages');
}

export function listKnowledgeModels(): Promise<string[]> {
  return apiFetch<{ models: string[] }>('/knowledge-bot/models').then((res) => res.models);
}

export function askKnowledgeBot(message: string, model?: string): Promise<KnowledgeMessage & { answer: string }> {
  return apiFetch<KnowledgeMessage & { answer: string }>('/knowledge-bot/chat', {
    method: 'POST',
    body: { message, model: model?.trim() || undefined },
  });
}

// One SSE frame from POST /knowledge-bot/chat/stream — mirrors
// apps/api/src/modules/knowledge-bot/knowledge-bot.service.ts's
// AiChatStreamChunk (itself mirroring apps/ai/knowledge_ai/models.py's
// ChatStreamChunk).
export type KnowledgeChatStreamChunk = {
  delta: string;
  done: boolean;
  model?: string;
  citations?: Array<Record<string, string>>;
};

/** Streams the assistant's reply token-by-token; the final chunk carries model/citations. */
export function askKnowledgeBotStream(
  message: string,
  model?: string,
): AsyncGenerator<KnowledgeChatStreamChunk> {
  return apiFetchStream<KnowledgeChatStreamChunk>('/knowledge-bot/chat/stream', {
    method: 'POST',
    body: { message, model: model?.trim() || undefined },
  });
}
