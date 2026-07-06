import { ServiceUnavailableException } from '@nestjs/common';
import { KnowledgeBotService } from './knowledge-bot.service';

type Chain = Record<string, jest.Mock> & {
  then: (
    resolve: (value: unknown) => unknown,
    reject: (err: unknown) => unknown,
  ) => Promise<unknown>;
};

function createDbMock() {
  const results: unknown[] = [];
  const queueResult = (value: unknown) => results.push(value);

  const makeChain = (): Chain => {
    const chain = {} as Chain;
    for (const method of [
      'from',
      'where',
      'orderBy',
      'limit',
      'offset',
      'values',
      'set',
      'returning',
    ]) {
      chain[method] = jest.fn(() => chain);
    }
    chain.then = (resolve, reject) => {
      const next = results.shift();
      if (next instanceof Error)
        return Promise.reject(next).then(resolve, reject);
      return Promise.resolve(next).then(resolve, reject);
    };
    return chain;
  };

  const db = {
    select: jest.fn(() => makeChain()),
    insert: jest.fn(() => makeChain()),
  };
  return { db, queueResult };
}

function makeService(
  dbMock: ReturnType<typeof createDbMock>,
  aiEnabled: boolean,
) {
  const tenantDb = {
    withTenantDb: jest.fn((_tenant: unknown, fn: (db: unknown) => unknown) =>
      fn(dbMock.db),
    ),
  };
  const ai = {
    enabled: aiEnabled,
    serviceUrl: 'http://ai-service.test',
  };
  const service = new KnowledgeBotService(tenantDb as never, ai);
  return { service, tenantDb };
}

const tenant = {
  tenantId: 't1',
  tenantSlug: 'acme',
  schemaName: 'tenant_acme',
  userId: 'u1',
} as never;

describe('KnowledgeBotService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createSource()', () => {
    it('inserts the source and syncs to the AI service when enabled', async () => {
      const dbMock = createDbMock();
      const row = { id: 's1', name: 'FAQ', kind: 'text', content: 'hello' };
      dbMock.queueResult([row]);
      const { service } = makeService(dbMock, true);
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      const result = await service.createSource(tenant, {
        name: 'FAQ',
        kind: 'text',
        content: 'hello',
      } as never);

      expect(result).toEqual(row);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://ai-service.test/v1/sources',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('skips the AI sync when AI is disabled', async () => {
      const dbMock = createDbMock();
      const row = { id: 's1', name: 'FAQ' };
      dbMock.queueResult([row]);
      const { service } = makeService(dbMock, false);
      const fetchMock = jest.spyOn(global, 'fetch');

      await service.createSource(tenant, {
        name: 'FAQ',
        kind: 'text',
      } as never);

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('chat()', () => {
    it('uses a local fallback when AI is disabled', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]); // history select
      dbMock.queueResult(undefined); // user message insert
      const assistantRow = {
        id: 'm2',
        role: 'assistant',
        content: 'local fallback',
        model: 'local-fallback',
        citations: [],
      };
      dbMock.queueResult([assistantRow]); // assistant message insert .returning()
      const { service } = makeService(dbMock, false);
      const fetchMock = jest.spyOn(global, 'fetch');

      const result = await service.chat(tenant, { message: 'hello' });

      expect(result.answer).toContain('Knowledge bot local mode is active');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(dbMock.db.insert).toHaveBeenCalledTimes(2);
    });

    it('records the user message, calls the AI service, and stores the reply', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]); // history select
      dbMock.queueResult(undefined); // user message insert
      const assistantRow = {
        id: 'm2',
        role: 'assistant',
        content: 'The answer',
        model: 'qwen3',
        citations: [],
      };
      dbMock.queueResult([assistantRow]); // assistant message insert .returning()
      const { service } = makeService(dbMock, true);
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            answer: 'The answer',
            model: 'qwen3',
            citations: [],
          }),
          { status: 200 },
        ),
      );

      const result = await service.chat(tenant, { message: 'hi' });

      expect(result).toEqual({ ...assistantRow, answer: 'The answer' });
    });

    it('throws ServiceUnavailableException when the AI service responds with an error', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]);
      dbMock.queueResult(undefined);
      const { service } = makeService(dbMock, true);
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('boom', { status: 500 }));

      await expect(service.chat(tenant, { message: 'hi' })).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('chatStream()', () => {
    function sseResponse(frames: string[]): Response {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const frame of frames) controller.enqueue(encoder.encode(frame));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    }

    function failingSseResponse(): Response {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"delta":"partial","done":false}\n\n'),
          );
          controller.error(new Error('stream broke'));
        },
      });
      return new Response(body, { status: 200 });
    }

    function fakeRes() {
      return {
        writeHead: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    }

    it('streams a local fallback when AI is disabled', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]); // history select
      dbMock.queueResult(undefined); // user message insert
      dbMock.queueResult([{ id: 'm2', role: 'assistant' }]); // assistant insert
      const { service } = makeService(dbMock, false);
      const res = fakeRes();

      await service.chatStream(tenant, { message: 'hi' }, res as never);

      expect(res.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
      );
      expect(res.write).toHaveBeenCalledTimes(2);
      expect(res.write).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('"model":"local-fallback"'),
      );
      expect(res.end).toHaveBeenCalledTimes(1);
    });

    it('forwards SSE frames to the response and persists the completed answer', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]); // history select
      dbMock.queueResult(undefined); // user message insert
      const assistantRow = { id: 'm2', role: 'assistant', content: 'Hi there' };
      dbMock.queueResult([assistantRow]); // assistant message insert .returning()
      const { service } = makeService(dbMock, true);
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          sseResponse([
            'data: {"delta":"Hi","done":false}\n\n',
            'data: {"delta":" there","done":false}\n\n',
            'data: {"delta":"","done":true,"model":"qwen3","citations":[{"id":"s1"}]}\n\n',
            'data: [DONE]\n\n',
          ]),
        );
      const res = fakeRes();

      await service.chatStream(tenant, { message: 'hi' }, res as never);

      expect(res.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
      );
      expect(res.write).toHaveBeenCalledTimes(5);
      expect(res.end).toHaveBeenCalledTimes(1);
      // Called once for the user message, once for the assistant reply.
      expect(dbMock.db.insert).toHaveBeenCalledTimes(2);
    });

    it('notifies the client and closes the SSE response when the upstream stream fails mid-flight', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]); // history select
      dbMock.queueResult(undefined); // user message insert
      const { service } = makeService(dbMock, true);
      jest.spyOn(global, 'fetch').mockResolvedValue(failingSseResponse());
      const res = fakeRes();

      await service.chatStream(tenant, { message: 'hi' }, res as never);

      expect(res.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
      );
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('AI response stream failed before completion'),
      );
      expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
      expect(res.end).toHaveBeenCalledTimes(1);
      // User message is saved, but an incomplete assistant reply is not persisted.
      expect(dbMock.db.insert).toHaveBeenCalledTimes(1);
    });

    it('returns an SSE error frame when the upstream request fails', async () => {
      const dbMock = createDbMock();
      dbMock.queueResult([]);
      dbMock.queueResult(undefined);
      const { service } = makeService(dbMock, true);
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('boom', { status: 500 }));
      const res = fakeRes();

      await service.chatStream(tenant, { message: 'hi' }, res as never);

      expect(res.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
      );
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('AI response stream failed before completion'),
      );
      expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
      expect(res.end).toHaveBeenCalledTimes(1);
    });
  });
});
