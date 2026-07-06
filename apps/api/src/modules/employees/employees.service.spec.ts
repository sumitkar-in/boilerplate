import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';

type Chain = Record<string, jest.Mock> & {
  then: (
    resolve: (value: unknown) => unknown,
    reject: (err: unknown) => unknown,
  ) => Promise<unknown>;
};

/**
 * Awaitable drizzle chain mock: every builder method returns the chain, and
 * awaiting it resolves the next queued result (one per db.select/insert/...
 * call, in order).
 */
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
    chain.then = (resolve, reject) =>
      Promise.resolve(results.shift()).then(resolve, reject);
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
  const departmentsService = { findOne: jest.fn() };
  const customFieldsService = { findAll: jest.fn().mockResolvedValue([]) };
  const usersService = {
    findByEmail: jest.fn().mockResolvedValue(null),
    createWithPassword: jest
      .fn()
      .mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
  };
  const membershipsService = {
    createMembership: jest.fn().mockResolvedValue({}),
  };
  const service = new EmployeesService(
    tenantDb as never,
    departmentsService as never,
    customFieldsService as never,
    usersService as never,
    membershipsService as never,
  );
  return {
    service,
    dbMock,
    tenantDb,
    departmentsService,
    customFieldsService,
    usersService,
    membershipsService,
  };
}

const tenant = { schemaName: 'tenant_acme' } as never;
const employeeInput = {
  name: 'Ada Lovelace',
  phone: '+15551234567',
  email: 'ada@example.com',
};

describe('EmployeesService', () => {
  describe('findAll()', () => {
    it('returns a paginated envelope with rows and total', async () => {
      const { service, dbMock } = makeService();
      const rows = [{ id: 'e1' }, { id: 'e2' }];
      dbMock.queueResult(rows);
      dbMock.queueResult([{ total: 42 }]);

      const result = await service.findAll(tenant, { limit: 10, offset: 20 });

      expect(result).toEqual({ rows, total: 42, limit: 10, offset: 20 });
    });

    it('rejects filters on unknown fields', async () => {
      const { service } = makeService();

      await expect(
        service.findAll(tenant, {
          filters: [{ field: 'nope', operator: 'contains', value: 'x' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult([]);

      await expect(service.findOne(tenant, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the row when found', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'e1', ...employeeInput };
      dbMock.queueResult([row]);

      const result = await service.findOne(tenant, 'e1');

      expect(result).toEqual(row);
    });
  });

  describe('create()', () => {
    it('inserts and returns the created row', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'e1', ...employeeInput };
      dbMock.queueResult([row]);

      const result = await service.create(tenant, employeeInput);

      expect(dbMock.chains[0].values).toHaveBeenCalledWith({
        ...employeeInput,
        customFields: {},
      });
      expect(result).toEqual(row);
    });

    it('rejects an unknown departmentId with BadRequestException', async () => {
      const { service, departmentsService } = makeService();
      departmentsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(tenant, {
          ...employeeInput,
          departmentId: '00000000-0000-0000-0000-000000000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('drops custom field values that have no definition', async () => {
      const { service, dbMock, customFieldsService } = makeService();
      customFieldsService.findAll.mockResolvedValue([{ fieldKey: 'location' }]);
      dbMock.queueResult([{ id: 'e1' }]);

      await service.create(tenant, {
        ...employeeInput,
        customFields: { location: 'Berlin', bogus: 'dropped' },
      });

      expect(dbMock.chains[0].values).toHaveBeenCalledWith({
        ...employeeInput,
        customFields: { location: 'Berlin' },
      });
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.queueResult([]);
      dbMock.queueResult([]);

      await expect(
        service.update(tenant, 'missing', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets updatedAt and returns the updated row', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'e1', ...employeeInput, name: 'New Name' };
      dbMock.queueResult([{ managerId: null }]);
      dbMock.queueResult([row]);

      const result = await service.update(tenant, 'e1', { name: 'New Name' });

      expect(dbMock.chains[1].set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          updatedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(row);
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
      dbMock.queueResult([{ id: 'e1' }]);

      const result = await service.remove(tenant, 'e1');

      expect(result).toEqual({ ok: true });
    });
  });
});
