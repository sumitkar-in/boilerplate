import { UnauthorizedException } from '@nestjs/common';
import { TwoFactorAuthService } from './two-factor-auth.service';

function createDeps() {
  const jwtService = { verifyAsync: jest.fn() };
  const usersService = { findById: jest.fn() };
  const tenantsService = { findById: jest.fn() };
  const membershipsService = { getMembership: jest.fn() };
  const twoFactorService = { verifyLoginCode: jest.fn() };
  const tokenService = {
    issueFullSession: jest.fn().mockResolvedValue({
      accessToken: 'signed.jwt.token',
      refreshToken: 'raw-refresh-token',
    }),
  };
  const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    jwtService,
    usersService,
    tenantsService,
    membershipsService,
    twoFactorService,
    tokenService,
    auditLogService,
  };
}

function makeService() {
  const deps = createDeps();
  const service = new TwoFactorAuthService(
    deps.jwtService as never,
    deps.usersService as never,
    deps.tenantsService as never,
    deps.membershipsService as never,
    deps.twoFactorService as never,
    deps.tokenService as never,
    deps.auditLogService as never,
  );
  return { service, ...deps };
}

const activeUser = {
  id: 'u1',
  email: 'owner@demo.test',
  isActive: true,
  twoFactorEnabled: true,
  twoFactorSecret: 'secret',
  isSuperAdmin: false,
};

describe('TwoFactorAuthService', () => {
  describe('verifyTwoFactorLogin()', () => {
    it('rejects an invalid or expired partial token', async () => {
      const { service, jwtService } = makeService();
      jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

      await expect(
        service.verifyTwoFactorLogin('bad', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token that is not purpose "2fa-pending"', async () => {
      const { service, jwtService } = makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        purpose: 'access',
      });

      await expect(
        service.verifyTwoFactorLogin('token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the user no longer has 2FA enabled', async () => {
      const { service, jwtService, usersService } = makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        purpose: '2fa-pending',
      });
      usersService.findById.mockResolvedValue({
        ...activeUser,
        twoFactorEnabled: false,
      });

      await expect(
        service.verifyTwoFactorLogin('token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an invalid TOTP/backup code', async () => {
      const { service, jwtService, usersService, twoFactorService } =
        makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        purpose: '2fa-pending',
      });
      usersService.findById.mockResolvedValue(activeUser);
      twoFactorService.verifyLoginCode.mockResolvedValue(false);

      await expect(
        service.verifyTwoFactorLogin('token', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a platform 2FA-pending token for a non-super-admin user', async () => {
      const { service, jwtService, usersService, twoFactorService } =
        makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        sessionType: 'platform',
        purpose: '2fa-pending',
      });
      usersService.findById.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: false,
      });
      twoFactorService.verifyLoginCode.mockResolvedValue(true);

      await expect(
        service.verifyTwoFactorLogin('token', '654321'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a platform session for a valid super-admin 2FA code', async () => {
      const {
        service,
        jwtService,
        usersService,
        twoFactorService,
        tokenService,
      } = makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        sessionType: 'platform',
        purpose: '2fa-pending',
      });
      usersService.findById.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: true,
      });
      twoFactorService.verifyLoginCode.mockResolvedValue(true);

      const result = await service.verifyTwoFactorLogin('token', '654321');

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
      expect(tokenService.issueFullSession).toHaveBeenCalledWith(
        expect.objectContaining({ isSuperAdmin: true }),
        null,
        undefined,
        'owner',
        { sessionType: 'platform' },
      );
    });

    it('issues full tokens for a valid tenant code', async () => {
      const {
        service,
        jwtService,
        usersService,
        twoFactorService,
        tenantsService,
        membershipsService,
      } = makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        purpose: '2fa-pending',
      });
      usersService.findById.mockResolvedValue(activeUser);
      twoFactorService.verifyLoginCode.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue({
        role: 'owner',
        status: 'active',
      });
      tenantsService.findById.mockResolvedValue({
        id: 't1',
        slug: 'acme',
        schemaName: 'tenant_acme',
        status: 'active',
      });

      const result = await service.verifyTwoFactorLogin('token', '654321');

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
    });

    it('rejects when the tenant membership is no longer active', async () => {
      const {
        service,
        jwtService,
        usersService,
        twoFactorService,
        tenantsService,
        membershipsService,
      } = makeService();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        purpose: '2fa-pending',
      });
      usersService.findById.mockResolvedValue(activeUser);
      twoFactorService.verifyLoginCode.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(undefined);
      tenantsService.findById.mockResolvedValue({
        id: 't1',
        slug: 'acme',
        schemaName: 'tenant_acme',
        status: 'active',
      });

      await expect(
        service.verifyTwoFactorLogin('token', '654321'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
