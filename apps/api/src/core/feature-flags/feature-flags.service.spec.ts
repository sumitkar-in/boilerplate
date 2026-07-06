import { FeatureFlagsService } from './feature-flags.service';

function createDbMock() {
  const limitMock = jest.fn().mockResolvedValue([]);
  const whereForSelectMock = jest.fn(() => ({ limit: limitMock }));
  const fromMock = jest.fn(() => ({ where: whereForSelectMock }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const onConflictDoUpdateMock = jest.fn().mockResolvedValue(undefined);
  const valuesMock = jest.fn(() => ({
    onConflictDoUpdate: onConflictDoUpdateMock,
  }));
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  const db = { select: selectMock, insert: insertMock };
  return {
    db,
    limitMock,
    whereForSelectMock,
    fromMock,
    selectMock,
    insertMock,
    valuesMock,
    onConflictDoUpdateMock,
  };
}

function createRedisMock() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };
}

describe('FeatureFlagsService', () => {
  it('isEnabled() returns the cached value without querying the DB on a cache hit', async () => {
    const { db, selectMock } = createDbMock();
    const redis = createRedisMock();
    redis.get.mockResolvedValue('1');
    const service = new FeatureFlagsService(db as never, redis as never);

    const enabled = await service.isEnabled('t1', 'notes');

    expect(enabled).toBe(true);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('isEnabled() falls back to the DB on a cache miss and populates the cache', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValue([{ enabled: true }]);
    const redis = createRedisMock();
    const service = new FeatureFlagsService(db as never, redis as never);

    const enabled = await service.isEnabled('t1', 'notes');

    expect(enabled).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('flag:t1:notes', '1', 'EX', 60);
  });

  it('isEnabled() returns false when no row exists for the tenant/feature pair', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValue([]);
    const redis = createRedisMock();
    const service = new FeatureFlagsService(db as never, redis as never);

    expect(await service.isEnabled('t1', 'unknown')).toBe(false);
    expect(redis.set).toHaveBeenCalledWith('flag:t1:unknown', '0', 'EX', 60);
  });

  it('setEnabled() upserts the DB row and refreshes the cache', async () => {
    const { db, insertMock, valuesMock, onConflictDoUpdateMock } =
      createDbMock();
    const redis = createRedisMock();
    const service = new FeatureFlagsService(db as never, redis as never);

    await service.setEnabled('t1', 'notes', true, 'user-1');

    expect(insertMock).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        featureKey: 'notes',
        enabled: true,
        updatedBy: 'user-1',
      }),
    );
    expect(onConflictDoUpdateMock).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith('flag:t1:notes', '1', 'EX', 60);
  });

  it('getEnabledFeatureKeys() returns the set of enabled feature keys for a tenant', async () => {
    const { db, whereForSelectMock } = createDbMock();
    // getEnabledFeatureKeys doesn't call .limit() — it awaits the where() result directly.
    (whereForSelectMock as jest.Mock).mockReturnValue(
      Promise.resolve([{ featureKey: 'notes' }, { featureKey: 'billing' }]),
    );
    const redis = createRedisMock();
    const service = new FeatureFlagsService(db as never, redis as never);

    const keys = await service.getEnabledFeatureKeys('t1');

    expect(keys).toEqual(new Set(['notes', 'billing']));
  });
});
