import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function createDeps() {
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    verifyAsync: jest.fn(),
  };
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    verifyPassword: jest.fn(),
  };
  const tenantsService = {
    findById: jest.fn(),
    getSettings: jest.fn().mockResolvedValue({
      settings: { security: { requireTwoFactor: false } },
    }),
  };
  const membershipsService = {
    getMembership: jest.fn(),
  };
  const tokenService = {
    issueAccessToken: jest.fn().mockResolvedValue('signed.jwt.token'),
    issueFullSession: jest.fn().mockResolvedValue({
      accessToken: 'signed.jwt.token',
      refreshToken: 'raw-refresh-token',
    }),
  };
  const refreshTokensService = {
    rotate: jest.fn(),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    jwtService,
    usersService,
    tenantsService,
    membershipsService,
    tokenService,
    refreshTokensService,
    auditLogService,
  };
}

function makeService() {
  const deps = createDeps();
  const authConfigMock = {
    accessTokenTtlSeconds: 900,
    twoFactorPendingTtlSeconds: 300,
    inviteTtlDays: 7,
  };
  const service = new AuthService(
    deps.jwtService as never,
    deps.usersService as never,
    deps.tenantsService as never,
    deps.membershipsService as never,
    deps.tokenService as never,
    deps.refreshTokensService as never,
    deps.auditLogService as never,
    authConfigMock as never,
  );
  return { service, ...deps };
}

const activeUser = {
  id: 'u1',
  email: 'owner@demo.test',
  passwordHash: 'hash',
  isActive: true,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  isSuperAdmin: false,
};
const activeMembership = { role: 'owner' as const, status: 'active' as const };

describe('AuthService', () => {
  describe('login()', () => {
    it('rejects an unknown email', async () => {
      const { service, usersService } = makeService();
      usersService.findByEmail.mockResolvedValue(undefined);

      await expect(
        service.login('t1', 'acme', 'nobody@x.com', 'pw'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated user', async () => {
      const { service, usersService } = makeService();
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });

      await expect(
        service.login('t1', 'acme', activeUser.email, 'pw'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      const { service, usersService } = makeService();
      usersService.findByEmail.mockResolvedValue(activeUser);
      usersService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login('t1', 'acme', activeUser.email, 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a user with no active membership in this tenant', async () => {
      const { service, usersService, membershipsService } = makeService();
      usersService.findByEmail.mockResolvedValue(activeUser);
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(undefined);

      await expect(
        service.login('t1', 'acme', activeUser.email, 'pw'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a membership that is invited but not yet active', async () => {
      const { service, usersService, membershipsService } = makeService();
      usersService.findByEmail.mockResolvedValue(activeUser);
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue({
        role: 'member',
        status: 'invited',
      });

      await expect(
        service.login('t1', 'acme', activeUser.email, 'pw'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues full tokens when 2FA is disabled', async () => {
      const { service, usersService, membershipsService, tokenService } =
        makeService();
      usersService.findByEmail.mockResolvedValue(activeUser);
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(activeMembership);

      const result = await service.login('t1', 'acme', activeUser.email, 'pw');

      expect(result).toEqual({
        twoFactorRequired: false,
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
      expect(tokenService.issueFullSession).toHaveBeenCalledWith(
        activeUser,
        't1',
        'acme',
        'owner',
      );
    });

    it('gives a super admin owner-level access even with no membership row', async () => {
      const { service, usersService, membershipsService, tokenService } =
        makeService();
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: true,
      });
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(undefined);

      const result = await service.login('t1', 'acme', activeUser.email, 'pw');

      expect(result.twoFactorRequired).toBe(false);
      expect(tokenService.issueFullSession).toHaveBeenCalledWith(
        expect.objectContaining({ isSuperAdmin: true }),
        't1',
        'acme',
        'owner',
      );
    });

    it('returns a partial token instead of full tokens when 2FA is enabled', async () => {
      const { service, usersService, membershipsService, tokenService } =
        makeService();
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        twoFactorEnabled: true,
      });
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(activeMembership);

      const result = await service.login('t1', 'acme', activeUser.email, 'pw');

      expect(result).toEqual({
        twoFactorRequired: true,
        partialToken: 'signed.jwt.token',
      });
      expect(tokenService.issueFullSession).not.toHaveBeenCalled();
    });

    it('flags twoFactorSetupRequired when the tenant mandates 2FA and the user has none set up', async () => {
      const { service, usersService, tenantsService, membershipsService } =
        makeService();
      usersService.findByEmail.mockResolvedValue(activeUser);
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(activeMembership);
      tenantsService.getSettings.mockResolvedValue({
        settings: { security: { requireTwoFactor: true } },
      });

      const result = await service.login('t1', 'acme', activeUser.email, 'pw');

      expect(result).toEqual({
        twoFactorRequired: false,
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
        twoFactorSetupRequired: true,
      });
    });

    it('does not flag twoFactorSetupRequired when the user already has 2FA enabled', async () => {
      const { service, usersService, tenantsService, membershipsService } =
        makeService();
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        twoFactorEnabled: true,
      });
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(activeMembership);
      tenantsService.getSettings.mockResolvedValue({
        settings: { security: { requireTwoFactor: true } },
      });

      // 2FA-enabled users take the partial-token branch regardless of the
      // tenant setting — verifyTwoFactorLogin() completes the session.
      const result = await service.login('t1', 'acme', activeUser.email, 'pw');

      expect(result).toEqual({
        twoFactorRequired: true,
        partialToken: 'signed.jwt.token',
      });
    });

    it('omits twoFactorSetupRequired when the tenant does not mandate 2FA', async () => {
      const { service, usersService, tenantsService, membershipsService } =
        makeService();
      usersService.findByEmail.mockResolvedValue(activeUser);
      usersService.verifyPassword.mockResolvedValue(true);
      membershipsService.getMembership.mockResolvedValue(activeMembership);
      tenantsService.getSettings.mockResolvedValue({
        settings: { security: { requireTwoFactor: false } },
      });

      const result = await service.login('t1', 'acme', activeUser.email, 'pw');

      expect(result).not.toHaveProperty('twoFactorSetupRequired');
    });
  });

  describe('requiresTwoFactorSetup()', () => {
    it('is false for a user who already has 2FA enabled, without checking tenant settings', async () => {
      const { service, tenantsService } = makeService();

      const result = await service.requiresTwoFactorSetup('t1', {
        ...activeUser,
        twoFactorEnabled: true,
      } as never);

      expect(result).toBe(false);
      expect(tenantsService.getSettings).not.toHaveBeenCalled();
    });

    it('reflects the tenant security.requireTwoFactor setting for a user without 2FA', async () => {
      const { service, tenantsService } = makeService();
      tenantsService.getSettings.mockResolvedValue({
        settings: { security: { requireTwoFactor: true } },
      });

      const result = await service.requiresTwoFactorSetup(
        't1',
        activeUser as never,
      );

      expect(result).toBe(true);
    });
  });

  describe('loginSuperAdmin()', () => {
    it('rejects a user who is not a super admin', async () => {
      const { service, usersService } = makeService();
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: false,
      });

      await expect(
        service.loginSuperAdmin(activeUser.email, 'pw'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a platform session for a valid super admin', async () => {
      const { service, usersService, tokenService } = makeService();
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: true,
      });
      usersService.verifyPassword.mockResolvedValue(true);

      const result = await service.loginSuperAdmin(activeUser.email, 'pw');

      expect(result).toEqual({
        twoFactorRequired: false,
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
  });

  describe('refresh()', () => {
    it('rotates the refresh token and issues a fresh access token', async () => {
      const {
        service,
        refreshTokensService,
        usersService,
        tenantsService,
        membershipsService,
      } = makeService();
      refreshTokensService.rotate.mockResolvedValue({
        userId: 'u1',
        tenantId: 't1',
        token: 'new-refresh-token',
        familyId: 'fam-1',
        expiresAt: new Date(),
        impersonatedBy: null,
        impersonationRole: null,
      });
      usersService.findById.mockResolvedValue(activeUser);
      membershipsService.getMembership.mockResolvedValue(activeMembership);
      tenantsService.findById.mockResolvedValue({
        id: 't1',
        slug: 'acme',
        schemaName: 'tenant_acme',
        status: 'active',
      });

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('rejects if the user is no longer active', async () => {
      const { service, refreshTokensService, usersService } = makeService();
      refreshTokensService.rotate.mockResolvedValue({
        userId: 'u1',
        tenantId: 't1',
        token: 'new-refresh-token',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });
      usersService.findById.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });

      await expect(service.refresh('old-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a non-super-admin platform-scoped refresh token', async () => {
      const { service, refreshTokensService, usersService } = makeService();
      refreshTokensService.rotate.mockResolvedValue({
        userId: 'u1',
        tenantId: null,
        token: 'new-refresh-token',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });
      usersService.findById.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: false,
      });

      await expect(service.refresh('old-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('issues a platform access token for a super-admin platform refresh token', async () => {
      const { service, refreshTokensService, usersService, tokenService } =
        makeService();
      refreshTokensService.rotate.mockResolvedValue({
        userId: 'u1',
        tenantId: null,
        token: 'new-refresh-token',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });
      usersService.findById.mockResolvedValue({
        ...activeUser,
        isSuperAdmin: true,
      });

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'new-refresh-token',
      });
      expect(tokenService.issueAccessToken).toHaveBeenCalledWith(
        'u1',
        undefined,
        undefined,
        'owner',
        { sessionType: 'platform' },
      );
    });

    it('uses the impersonation role on the access token when the refresh token was impersonated', async () => {
      const {
        service,
        refreshTokensService,
        usersService,
        tenantsService,
        membershipsService,
        tokenService,
      } = makeService();
      refreshTokensService.rotate.mockResolvedValue({
        userId: 'u1',
        tenantId: 't1',
        token: 'new-refresh-token',
        familyId: 'fam-1',
        expiresAt: new Date(),
        impersonatedBy: 'admin-1',
        impersonationRole: 'viewer',
      });
      usersService.findById.mockResolvedValue(activeUser);
      membershipsService.getMembership.mockResolvedValue(activeMembership);
      tenantsService.findById.mockResolvedValue({
        id: 't1',
        slug: 'acme',
        schemaName: 'tenant_acme',
        status: 'active',
      });

      await service.refresh('old-refresh-token');

      expect(tokenService.issueAccessToken).toHaveBeenCalledWith(
        'u1',
        't1',
        'acme',
        'viewer',
        { sessionType: 'impersonation', impersonatedBy: 'admin-1' },
      );
    });
  });

  describe('logout()', () => {
    it('revokes the given refresh token', async () => {
      const { service, refreshTokensService } = makeService();

      await service.logout('some-token');

      expect(refreshTokensService.revoke).toHaveBeenCalledWith('some-token');
    });
  });
});
