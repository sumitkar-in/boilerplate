import { NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

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

  const chains: Chain[] = [];
  const nextChain = jest.fn(() => {
    const chain = makeChain();
    chains.push(chain);
    return chain;
  });

  const db = {
    select: nextChain,
    insert: nextChain,
    update: nextChain,
    delete: nextChain,
  };
  return { db, queueResult, chains };
}

function makeService() {
  const dbMock = createDbMock();
  const tenantDb = {
    withTenantDb: jest.fn((_tenant: unknown, fn: (db: unknown) => unknown) =>
      fn(dbMock.db),
    ),
  };
  const service = new DepartmentsService(tenantDb as never);
  return { service, dbMock };
}

const tenant = { schemaName: 'tenant_acme' } as never;

function uniqueViolation(): Error {
  const err = new Error('duplicate key value violates unique constraint');
  (err as Error & { code: string }).code = '23505';
  return err;
}

describe('DepartmentsService', () => {
  describe('findAll()', () => {
    it('returns a paginated envelope with rows and total', async () => {
      const { service, dbMock } = makeService();
      const rows = [{ id: 'd1', name: 'Engineering' }];
      dbMock.queueResult(rows);
      dbMock.queueResult([{ total: 1 }]);

      const result = await service.findAll(tenant, {});

      expect(result).toEqual({ rows, total: 1, limit: 50, offset: 0 });
    });
  });

  describe('create()', () => {
    it('inserts and returns the created row', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'd1', name: 'Engineering' };
      dbMock.queueResult([row]);

      const result = await service.create(tenant, { name: 'Engineering' });

      expect(result).toEqual(row);
    });

    it('lets unique violations propagate to the global filter', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult(uniqueViolation());

      await expect(
        service.create(tenant, { name: 'Engineering' }),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult([]);

      await expect(
        service.update(tenant, 'missing', { name: 'Ops' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lets unique violations propagate to the global filter', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult(uniqueViolation());

      await expect(
        service.update(tenant, 'd1', { name: 'Ops' }),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  describe('remove()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult([]);

      await expect(service.remove(tenant, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns { ok: true } when the row is deleted', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult([{ id: 'd1' }]);

      const result = await service.remove(tenant, 'd1');

      expect(result).toEqual({ ok: true });
    });
  });
});
