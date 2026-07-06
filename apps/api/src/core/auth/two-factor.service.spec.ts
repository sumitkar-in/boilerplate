import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { TwoFactorService } from './two-factor.service';
import { hashBackupCode } from './two-factor.util';
import type { UserRecord } from '../users/users.service';

function createDbMock() {
  const whereMock = jest.fn().mockResolvedValue([]);
  const fromMock = jest.fn(() => ({ where: whereMock }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const valuesMock = jest.fn().mockResolvedValue(undefined);
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn(() => ({ where: deleteWhereMock }));

  const updateWhereMock = jest.fn().mockResolvedValue(undefined);
  const setMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: setMock }));

  const db = {
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
    update: updateMock,
  };
  return {
    db,
    whereMock,
    insertMock,
    valuesMock,
    deleteMock,
    deleteWhereMock,
    updateMock,
    setMock,
    updateWhereMock,
  };
}

function createUsersServiceMock() {
  return {
    setTwoFactorSecret: jest.fn().mockResolvedValue(undefined),
    enableTwoFactor: jest.fn().mockResolvedValue(undefined),
    disableTwoFactor: jest.fn().mockResolvedValue(undefined),
  };
}

const baseUser: UserRecord = {
  id: 'u1',
  email: 'owner@demo.test',
  passwordHash: 'hash',
  fullName: null,
  isActive: true,
  isSuperAdmin: false,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TwoFactorService', () => {
  it('setup() generates a secret, stores it, and returns a scannable QR code', async () => {
    const { db } = createDbMock();
    const usersService = createUsersServiceMock();
    const appConfigMock = { name: 'Boilerplate' };
    const service = new TwoFactorService(
      db as never,
      usersService as never,
      appConfigMock as never,
    );

    const result = await service.setup(baseUser);

    expect(usersService.setTwoFactorSecret).toHaveBeenCalledWith(
      'u1',
      result.secret,
    );
    expect(result.otpauthUrl).toContain(result.secret);
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('confirmEnable() rejects if setup() was never called', async () => {
    const { db } = createDbMock();
    const usersService = createUsersServiceMock();
    const appConfigMock = { name: 'Boilerplate' };
    const service = new TwoFactorService(
      db as never,
      usersService as never,
      appConfigMock as never,
    );

    await expect(service.confirmEnable(baseUser, '123456')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('confirmEnable() rejects an invalid TOTP code', async () => {
    const { db } = createDbMock();
    const usersService = createUsersServiceMock();
    const appConfigMock = { name: 'Boilerplate' };
    const service = new TwoFactorService(
      db as never,
      usersService as never,
      appConfigMock as never,
    );
    const userWithSecret = {
      ...baseUser,
      twoFactorSecret: authenticator.generateSecret(),
    };

    await expect(
      service.confirmEnable(userWithSecret, '000000'),
    ).rejects.toThrow(UnauthorizedException);
    expect(usersService.enableTwoFactor).not.toHaveBeenCalled();
  });

  it('confirmEnable() enables 2FA and returns 10 backup codes for a valid code', async () => {
    const { db, insertMock, valuesMock } = createDbMock();
    const usersService = createUsersServiceMock();
    const appConfigMock = { name: 'Boilerplate' };
    const service = new TwoFactorService(
      db as never,
      usersService as never,
      appConfigMock as never,
    );
    const secret = authenticator.generateSecret();
    const userWithSecret = { ...baseUser, twoFactorSecret: secret };
    const code = authenticator.generate(secret);

    const result = await service.confirmEnable(userWithSecret, code);

    expect(usersService.enableTwoFactor).toHaveBeenCalledWith('u1');
    expect(result.backupCodes).toHaveLength(10);
    expect(insertMock).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'u1', codeHash: expect.any(String) }),
      ]),
    );
  });

  it('disable() clears the secret and deletes backup codes', async () => {
    const { db, deleteMock, deleteWhereMock } = createDbMock();
    const usersService = createUsersServiceMock();
    const appConfigMock = { name: 'Boilerplate' };
    const service = new TwoFactorService(
      db as never,
      usersService as never,
      appConfigMock as never,
    );

    await service.disable(baseUser);

    expect(usersService.disableTwoFactor).toHaveBeenCalledWith('u1');
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteWhereMock).toHaveBeenCalled();
  });

  describe('verifyLoginCode()', () => {
    it('accepts a valid TOTP code', async () => {
      const { db } = createDbMock();
      const usersService = createUsersServiceMock();
      const appConfigMock = { name: 'Boilerplate' };
      const service = new TwoFactorService(
        db as never,
        usersService as never,
        appConfigMock as never,
      );
      const secret = authenticator.generateSecret();
      const userWithSecret = { ...baseUser, twoFactorSecret: secret };

      const ok = await service.verifyLoginCode(
        userWithSecret,
        authenticator.generate(secret),
      );
      expect(ok).toBe(true);
    });

    it('falls back to an unused backup code and marks it consumed', async () => {
      const plainCode = 'abcde-12345';
      const codeHash = await hashBackupCode(plainCode);
      const { db, whereMock, updateMock, setMock, updateWhereMock } =
        createDbMock();
      whereMock.mockResolvedValue([{ id: 'code-1', codeHash, usedAt: null }]);
      const usersService = createUsersServiceMock();
      const appConfigMock = { name: 'Boilerplate' };
      const service = new TwoFactorService(
        db as never,
        usersService as never,
        appConfigMock as never,
      );
      const userWithSecret = {
        ...baseUser,
        twoFactorSecret: authenticator.generateSecret(),
      };

      const ok = await service.verifyLoginCode(userWithSecret, plainCode);

      expect(ok).toBe(true);
      expect(updateMock).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
      expect(updateWhereMock).toHaveBeenCalled();
    });

    it('rejects a code that matches neither TOTP nor any unused backup code', async () => {
      const { db, whereMock } = createDbMock();
      whereMock.mockResolvedValue([]);
      const usersService = createUsersServiceMock();
      const appConfigMock = { name: 'Boilerplate' };
      const service = new TwoFactorService(
        db as never,
        usersService as never,
        appConfigMock as never,
      );
      const userWithSecret = {
        ...baseUser,
        twoFactorSecret: authenticator.generateSecret(),
      };

      const ok = await service.verifyLoginCode(userWithSecret, 'totally-wrong');
      expect(ok).toBe(false);
    });
  });
});
