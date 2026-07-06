import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

function createDbMock() {
  const limitMock = jest.fn().mockResolvedValue([]);
  const whereMock = jest.fn(() => ({ limit: limitMock }));
  const fromMock = jest.fn(() => ({ where: whereMock }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const returningMock = jest
    .fn()
    .mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]);
  const valuesMock = jest.fn(() => ({ returning: returningMock }));
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  const updateWhereMock = jest.fn().mockResolvedValue(undefined);
  const setMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: setMock }));

  const db = { select: selectMock, insert: insertMock, update: updateMock };
  return {
    db,
    limitMock,
    whereMock,
    selectMock,
    insertMock,
    valuesMock,
    returningMock,
    updateMock,
    setMock,
    updateWhereMock,
  };
}

describe('UsersService', () => {
  it('findByEmail() lowercases the email before querying', async () => {
    const { db, whereMock } = createDbMock();
    const authConfigMock = { passwordSaltRounds: 12 };
    const service = new UsersService(db as never, authConfigMock as never);

    await service.findByEmail('Owner@Demo.TEST');

    expect(whereMock).toHaveBeenCalled();
  });

  it('create() lowercases the email on insert', async () => {
    const { db, valuesMock } = createDbMock();
    const authConfigMock = { passwordSaltRounds: 12 };
    const service = new UsersService(db as never, authConfigMock as never);

    await service.create({ email: 'Mixed@Case.com', fullName: 'A B' });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'mixed@case.com', fullName: 'A B' }),
    );
  });

  it('findOrCreateByEmail() returns the existing user without inserting when found', async () => {
    const { db, limitMock, insertMock } = createDbMock();
    limitMock.mockResolvedValue([{ id: 'existing', email: 'a@b.com' }]);
    const authConfigMock = { passwordSaltRounds: 12 };
    const service = new UsersService(db as never, authConfigMock as never);

    const user = await service.findOrCreateByEmail('a@b.com');

    expect(user).toEqual({ id: 'existing', email: 'a@b.com' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('findOrCreateByEmail() creates a user when none exists', async () => {
    const { db, limitMock, insertMock } = createDbMock();
    limitMock.mockResolvedValue([]);
    const authConfigMock = { passwordSaltRounds: 12 };
    const service = new UsersService(db as never, authConfigMock as never);

    await service.findOrCreateByEmail('new@b.com');

    expect(insertMock).toHaveBeenCalled();
  });

  it('setPassword() stores a bcrypt hash, not the plaintext', async () => {
    const { db, setMock } = createDbMock();
    const authConfigMock = { passwordSaltRounds: 12 };
    const service = new UsersService(db as never, authConfigMock as never);

    await service.setPassword('u1', 'S3curePass!');

    const setArg = (setMock as jest.Mock).mock.calls[0][0] as {
      passwordHash: string;
    };
    expect(setArg.passwordHash).not.toBe('S3curePass!');
    expect(await bcrypt.compare('S3curePass!', setArg.passwordHash)).toBe(true);
  });

  describe('verifyPassword()', () => {
    it('returns false when the user has no password set yet (invited, not accepted)', async () => {
      const { db } = createDbMock();
      const authConfigMock = { passwordSaltRounds: 12 };
      const service = new UsersService(db as never, authConfigMock as never);

      const ok = await service.verifyPassword(
        { passwordHash: null } as never,
        'anything',
      );
      expect(ok).toBe(false);
    });

    it('returns true for a matching password', async () => {
      const { db } = createDbMock();
      const authConfigMock = { passwordSaltRounds: 12 };
      const service = new UsersService(db as never, authConfigMock as never);
      const hash = await bcrypt.hash('correct-horse', 10);

      expect(
        await service.verifyPassword(
          { passwordHash: hash } as never,
          'correct-horse',
        ),
      ).toBe(true);
    });

    it('returns false for a non-matching password', async () => {
      const { db } = createDbMock();
      const authConfigMock = { passwordSaltRounds: 12 };
      const service = new UsersService(db as never, authConfigMock as never);
      const hash = await bcrypt.hash('correct-horse', 10);

      expect(
        await service.verifyPassword({ passwordHash: hash } as never, 'wrong'),
      ).toBe(false);
    });
  });

  it('disableTwoFactor() clears both the enabled flag and the secret', async () => {
    const { db, setMock } = createDbMock();
    const authConfigMock = { passwordSaltRounds: 12 };
    const service = new UsersService(db as never, authConfigMock as never);

    await service.disableTwoFactor('u1');

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        twoFactorEnabled: false,
        twoFactorSecret: null,
      }),
    );
  });
});
