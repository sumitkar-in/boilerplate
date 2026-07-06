import { TenantDbService } from './tenant-db.service';

function createPoolMock() {
  const client = {
    query: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
  };
  const pool = { connect: jest.fn().mockResolvedValue(client) };
  return { pool, client };
}

describe('TenantDbService', () => {
  it('rejects an unsafe schema name without touching the pool', async () => {
    const { pool } = createPoolMock();
    const service = new TenantDbService(pool as never);

    await expect(
      service.withTenantDb(
        { schemaName: 'tenant_acme"; DROP TABLE users; --' },
        () => Promise.resolve('never'),
      ),
    ).rejects.toThrow('Unsafe schema name');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('sets search_path to the tenant schema before running the callback', async () => {
    const { pool, client } = createPoolMock();
    const service = new TenantDbService(pool as never);

    await service.withTenantDb({ schemaName: 'tenant_acme' }, () =>
      Promise.resolve('result'),
    );

    expect(client.query).toHaveBeenCalledWith(
      'SET search_path TO "tenant_acme", public',
    );
  });

  it('returns the callback result', async () => {
    const { pool } = createPoolMock();
    const service = new TenantDbService(pool as never);

    const result = await service.withTenantDb(
      { schemaName: 'tenant_acme' },
      () => Promise.resolve(42),
    );

    expect(result).toBe(42);
  });

  it('always releases the client back to the pool, even if the callback throws', async () => {
    const { pool, client } = createPoolMock();
    const service = new TenantDbService(pool as never);

    await expect(
      service.withTenantDb({ schemaName: 'tenant_acme' }, () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('releases the client on the success path too', async () => {
    const { pool, client } = createPoolMock();
    const service = new TenantDbService(pool as never);

    await service.withTenantDb({ schemaName: 'tenant_acme' }, () =>
      Promise.resolve('ok'),
    );

    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
