import { createHash } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokensService } from './refresh-tokens.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createDbMock() {
  const limitMock = jest.fn();
  const whereMock = jest.fn(() => ({ limit: limitMock }));
  const fromMock = jest.fn(() => ({ where: whereMock }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const valuesMock = jest.fn().mockResolvedValue(undefined);
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  // update().set().where() is both awaited directly (revoke/revokeFamily,
  // and the final replacedById update) and chained with .returning() (the
  // atomic rotation claim) — a plain object satisfies both, since awaiting
  // a non-promise object just resolves to itself.
  const returningMock = jest.fn().mockResolvedValue([{ id: 'claimed-id' }]);
  const updateWhereMock = jest.fn(() => ({ returning: returningMock }));
  const setMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: setMock }));

  const db = { select: selectMock, insert: insertMock, update: updateMock };
  return {
    db,
    limitMock,
    selectMock,
    insertMock,
    valuesMock,
    updateMock,
    setMock,
    updateWhereMock,
    returningMock,
  };
}

describe('RefreshTokensService', () => {
  it('issue() stores a sha256 hash of the token, never the raw value', async () => {
    const { db, valuesMock } = createDbMock();
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    const issued = await service.issue('user-1', 'tenant-1');

    expect(issued.token).toHaveLength(96); // 48 random bytes, hex-encoded
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tenantId: 'tenant-1',
        tokenHash: hashToken(issued.token),
        familyId: issued.familyId,
      }),
    );
  });

  it('issue() reuses the given familyId when rotating, generates a new one otherwise', async () => {
    const { db } = createDbMock();
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    const fresh = await service.issue('u1', 't1');
    const rotated = await service.issue('u1', 't1', fresh.familyId);

    expect(rotated.familyId).toBe(fresh.familyId);
  });

  it('rotate() throws for an unknown token', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValueOnce([]);
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    await expect(service.rotate('unknown-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotate() throws for an expired token', async () => {
    const { db, limitMock } = createDbMock();
    limitMock.mockResolvedValueOnce([
      {
        id: 'row-1',
        userId: 'u1',
        tenantId: 't1',
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    await expect(service.rotate('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotate() detects reuse of an already-revoked token and revokes the whole family', async () => {
    const { db, limitMock, updateMock, setMock, updateWhereMock } =
      createDbMock();
    limitMock.mockResolvedValueOnce([
      {
        id: 'row-1',
        userId: 'u1',
        tenantId: 't1',
        familyId: 'fam-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100_000),
      },
    ]);
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    await expect(service.rotate('stolen-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(updateMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('rotate() treats a lost race on the atomic claim as reuse and revokes the family', async () => {
    // Simulates two concurrent /auth/refresh calls for the same token: the
    // initial SELECT sees revokedAt: null (not yet revoked by the other
    // request), but by the time this request's claim UPDATE runs, the
    // other request already claimed it — so `WHERE revoked_at IS NULL`
    // matches zero rows and .returning() comes back empty.
    const { db, limitMock, returningMock, updateMock, setMock } =
      createDbMock();
    returningMock.mockResolvedValueOnce([]);
    limitMock.mockResolvedValueOnce([
      {
        id: 'row-1',
        userId: 'u1',
        tenantId: 't1',
        familyId: 'fam-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100_000),
      },
    ]);
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    await expect(service.rotate('raced-token')).rejects.toThrow(
      UnauthorizedException,
    );
    // The claim update, then revokeFamily's update — two update() calls,
    // no token issued in between.
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });

  it('rotate() revokes the presented token and issues a fresh one in the same family', async () => {
    const { db, limitMock, updateMock, setMock } = createDbMock();
    limitMock
      .mockResolvedValueOnce([
        {
          id: 'row-1',
          userId: 'u1',
          tenantId: 't1',
          familyId: 'fam-1',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 100_000),
        },
      ])
      .mockResolvedValueOnce([{ id: 'row-2' }]);
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    const result = await service.rotate('valid-token');

    expect(result.userId).toBe('u1');
    expect(result.tenantId).toBe('t1');
    expect(result.familyId).toBe('fam-1');
    expect(updateMock).toHaveBeenCalled();
    // Rotation is now two calls: an atomic claim (revokedAt, guarded by
    // revoked_at IS NULL) and, once the new token is issued, a second
    // update linking replacedById.
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ replacedById: 'row-2' }),
    );
  });

  it('revoke() only touches non-revoked rows matching the token hash', async () => {
    const { db, setMock, updateWhereMock } = createDbMock();
    const authConfigMock = { refreshTokenTtlDays: 30 };
    const service = new RefreshTokensService(
      db as never,
      authConfigMock as never,
    );

    await service.revoke('some-token');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(updateWhereMock).toHaveBeenCalled();
  });
});
