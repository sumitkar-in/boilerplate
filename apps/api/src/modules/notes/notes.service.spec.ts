import { NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';

function createDbMock() {
  const offsetMock = jest.fn<Promise<unknown[]>, [number]>();
  const limitMock = jest.fn<unknown, [number]>(() => ({ offset: offsetMock }));
  const selectOrderByMock = jest.fn<unknown, [unknown]>(() => ({
    limit: limitMock,
  }));
  const selectWhereMock = jest.fn<unknown, [unknown]>(() => ({
    limit: limitMock,
  }));
  const selectFromMock = jest.fn<unknown, [unknown]>(() => ({
    where: selectWhereMock,
  }));
  const selectMock = jest.fn<unknown, []>(() => ({ from: selectFromMock }));

  const insertReturningMock = jest.fn();
  const insertValuesMock = jest.fn(() => ({ returning: insertReturningMock }));
  const insertMock = jest.fn(() => ({ values: insertValuesMock }));

  const updateReturningMock = jest.fn();
  const updateWhereMock = jest.fn(() => ({ returning: updateReturningMock }));
  const updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: updateSetMock }));

  const deleteReturningMock = jest.fn();
  const deleteWhereMock = jest.fn(() => ({ returning: deleteReturningMock }));
  const deleteMock = jest.fn(() => ({ where: deleteWhereMock }));

  const db = {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  };
  return {
    db,
    limitMock,
    offsetMock,
    selectWhereMock,
    selectOrderByMock,
    insertReturningMock,
    insertValuesMock,
    updateReturningMock,
    updateSetMock,
    deleteReturningMock,
  };
}

function makeService() {
  const dbMock = createDbMock();
  const tenantDb = {
    withTenantDb: jest.fn((_tenant: unknown, fn: (db: unknown) => unknown) =>
      fn(dbMock.db),
    ),
  };
  const service = new NotesService(tenantDb as never);
  return { service, dbMock, tenantDb };
}

const tenant = { schemaName: 'tenant_acme' } as never;

describe('NotesService', () => {
  describe('findAll()', () => {
    it('returns notes ordered by createdAt descending', async () => {
      const { service, dbMock } = makeService();
      const rows = [{ id: 'n1' }, { id: 'n2' }];
      dbMock.offsetMock.mockResolvedValue(rows);
      dbMock.selectWhereMock
        .mockReturnValueOnce({ orderBy: dbMock.selectOrderByMock })
        .mockReturnValueOnce(Promise.resolve([{ total: rows.length }]));

      const result = await service.findAll(tenant);

      expect(result).toEqual({
        rows,
        total: rows.length,
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('findOne()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.limitMock.mockReturnValue(Promise.resolve([]));

      await expect(service.findOne(tenant, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the row when found', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'n1', title: 'Hello' };
      dbMock.limitMock.mockReturnValue(Promise.resolve([row]));

      const result = await service.findOne(tenant, 'n1');

      expect(result).toEqual(row);
    });
  });

  describe('create()', () => {
    it('inserts and returns the created row', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'n1', title: 'Hello', content: 'World' };
      dbMock.insertReturningMock.mockResolvedValue([row]);

      const result = await service.create(tenant, {
        title: 'Hello',
        content: 'World',
      });

      expect(dbMock.insertValuesMock).toHaveBeenCalledWith({
        title: 'Hello',
        content: 'World',
      });
      expect(result).toEqual(row);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.updateReturningMock.mockResolvedValue([]);

      await expect(
        service.update(tenant, 'missing', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets updatedAt and returns the updated row', async () => {
      const { service, dbMock } = makeService();
      const row = { id: 'n1', title: 'New' };
      dbMock.updateReturningMock.mockResolvedValue([row]);

      const result = await service.update(tenant, 'n1', { title: 'New' });

      expect(dbMock.updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New', updatedAt: expect.any(Date) }),
      );
      expect(result).toEqual(row);
    });
  });

  describe('remove()', () => {
    it('throws NotFoundException when no row matches', async () => {
      const { service, dbMock } = makeService();
      dbMock.deleteReturningMock.mockResolvedValue([]);

      await expect(service.remove(tenant, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns { ok: true } when the row is deleted', async () => {
      const { service, dbMock } = makeService();
      dbMock.deleteReturningMock.mockResolvedValue([{ id: 'n1' }]);

      const result = await service.remove(tenant, 'n1');

      expect(result).toEqual({ ok: true });
    });
  });
});
