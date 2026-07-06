import { TokenService } from './token.service';

function makeService() {
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
  };
  const refreshTokensService = {
    issue: jest.fn().mockResolvedValue({
      token: 'raw-refresh-token',
      expiresAt: new Date(),
      familyId: 'fam-1',
    }),
  };
  const authConfigMock = { accessTokenTtlSeconds: 900 };
  const service = new TokenService(
    jwtService as never,
    refreshTokensService as never,
    authConfigMock as never,
  );
  return { service, jwtService, refreshTokensService };
}

const user = { id: 'u1', email: 'owner@demo.test' };

describe('TokenService', () => {
  describe('issueAccessToken()', () => {
    it('signs a payload with the configured TTL', async () => {
      const { service, jwtService } = makeService();

      const token = await service.issueAccessToken('u1', 't1', 'acme', 'owner');

      expect(token).toBe('signed.jwt.token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'u1',
          tenantId: 't1',
          tenantSlug: 'acme',
          role: 'owner',
          sessionType: 'tenant',
          purpose: 'access',
        }),
        { expiresIn: 900 },
      );
    });

    it('defaults sessionType to "tenant" when no options are given', async () => {
      const { service, jwtService } = makeService();

      await service.issueAccessToken('u1', undefined, undefined, 'viewer');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sessionType: 'tenant' }),
        { expiresIn: 900 },
      );
    });
  });

  describe('issueFullSession()', () => {
    it('issues a plain refresh token for a normal session', async () => {
      const { service, refreshTokensService } = makeService();

      const result = await service.issueFullSession(
        user as never,
        't1',
        'acme',
        'owner',
      );

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
      expect(refreshTokensService.issue).toHaveBeenCalledWith('u1', 't1');
    });

    it('issues an impersonation-tagged refresh token when impersonating', async () => {
      const { service, refreshTokensService } = makeService();

      await service.issueFullSession(user as never, 't1', 'acme', 'viewer', {
        sessionType: 'impersonation',
        impersonatedBy: 'admin-1',
      });

      expect(refreshTokensService.issue).toHaveBeenCalledWith(
        'u1',
        't1',
        undefined,
        { impersonatedBy: 'admin-1', role: 'viewer' },
      );
    });

    it('passes a null tenantId through for platform sessions', async () => {
      const { service, refreshTokensService } = makeService();

      await service.issueFullSession(user as never, null, undefined, 'owner', {
        sessionType: 'platform',
      });

      expect(refreshTokensService.issue).toHaveBeenCalledWith('u1', null);
    });
  });
});
