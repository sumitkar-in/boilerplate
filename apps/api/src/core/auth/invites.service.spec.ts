import { BadRequestException } from '@nestjs/common';
import { InvitesService } from './invites.service';

function createDbMock() {
  const limitMock = jest.fn().mockResolvedValue([]);
  const whereForSelectMock = jest.fn(() => ({ limit: limitMock }));
  const fromMock = jest.fn(() => ({ where: whereForSelectMock }));
  const selectMock = jest.fn(() => ({ from: fromMock }));

  const valuesMock = jest.fn().mockResolvedValue(undefined);
  const insertMock = jest.fn(() => ({ values: valuesMock }));

  const updateWhereMock = jest.fn().mockResolvedValue(undefined);
  const setMock = jest.fn(() => ({ where: updateWhereMock }));
  const updateMock = jest.fn(() => ({ set: setMock }));

  const db = { select: selectMock, insert: insertMock, update: updateMock };
  return {
    db,
    limitMock,
    insertMock,
    valuesMock,
    setMock,
  };
}

function createDeps() {
  const usersService = {
    findOrCreateByEmail: jest.fn(),
    findOrCreateWithPassword: jest.fn(),
    findByEmail: jest.fn(),
    setPassword: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn().mockResolvedValue(undefined),
  };
  const tenantsService = {
    findById: jest.fn(),
    getSettings: jest.fn().mockResolvedValue(undefined),
  };
  const membershipsService = {
    createMembership: jest.fn().mockResolvedValue(undefined),
    activateMembership: jest.fn().mockResolvedValue(undefined),
    getMembership: jest.fn(),
  };
  const tokenService = {
    issueFullSession: jest.fn().mockResolvedValue({
      accessToken: 'signed.jwt.token',
      refreshToken: 'raw-refresh-token',
    }),
  };
  const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    usersService,
    tenantsService,
    membershipsService,
    tokenService,
    auditLogService,
  };
}

function makeService(dbOverride?: ReturnType<typeof createDbMock>) {
  const dbMock = dbOverride ?? createDbMock();
  const deps = createDeps();
  const authConfigMock = { inviteTtlDays: 7 };
  const service = new InvitesService(
    dbMock.db as never,
    deps.usersService as never,
    deps.tenantsService as never,
    deps.membershipsService as never,
    deps.tokenService as never,
    deps.auditLogService as never,
    authConfigMock as never,
  );
  return { service, dbMock, ...deps };
}

describe('InvitesService', () => {
  describe('createInvite()', () => {
    it('finds/creates the invitee, creates an invited membership, and stores a hashed invite token', async () => {
      const { service, usersService, membershipsService, dbMock } =
        makeService();
      usersService.findOrCreateByEmail.mockResolvedValue({
        id: 'invitee-1',
        email: 'new@demo.test',
      });

      const result = await service.createInvite(
        't1',
        'inviter-1',
        'new@demo.test',
        'member',
      );

      expect(membershipsService.createMembership).toHaveBeenCalledWith({
        tenantId: 't1',
        userId: 'invitee-1',
        role: 'member',
        status: 'invited',
      });
      expect(dbMock.insertMock).toHaveBeenCalled();
      expect(dbMock.valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          email: 'new@demo.test',
          role: 'member',
          invitedBy: 'inviter-1',
        }),
      );
      expect(result.inviteToken).toHaveLength(64); // 32 random bytes, hex-encoded
    });

    it('rejects invites outside the tenant allowed email domains', async () => {
      const { service, tenantsService, usersService } = makeService();
      tenantsService.getSettings.mockResolvedValue({
        settings: { security: { allowedDomains: ['demo.test'] } },
      });

      await expect(
        service.createInvite('t1', 'inviter-1', 'new@other.test', 'member'),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findOrCreateByEmail).not.toHaveBeenCalled();
    });
  });

  describe('createTenantUser()', () => {
    it('creates an active membership and returns a temporary password when none is given', async () => {
      const { service, usersService, membershipsService } = makeService();
      usersService.findOrCreateWithPassword.mockResolvedValue({
        user: { id: 'u2', email: 'new@demo.test', fullName: null },
      });

      const result = await service.createTenantUser('t1', 'creator-1', {
        email: 'new@demo.test',
        role: 'member',
      });

      expect(membershipsService.createMembership).toHaveBeenCalledWith({
        tenantId: 't1',
        userId: 'u2',
        role: 'member',
        status: 'active',
      });
      expect(result.temporaryPassword).toEqual(expect.any(String));
    });

    it('rejects direct user creation outside the tenant allowed email domains', async () => {
      const { service, tenantsService, usersService } = makeService();
      tenantsService.getSettings.mockResolvedValue({
        settings: { security: { allowedDomains: ['demo.test'] } },
      });

      await expect(
        service.createTenantUser('t1', 'creator-1', {
          email: 'new@other.test',
          role: 'member',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findOrCreateWithPassword).not.toHaveBeenCalled();
    });

    it('omits temporaryPassword from the result when the caller supplied one', async () => {
      const { service, usersService } = makeService();
      usersService.findOrCreateWithPassword.mockResolvedValue({
        user: { id: 'u2', email: 'new@demo.test', fullName: null },
      });

      const result = await service.createTenantUser('t1', 'creator-1', {
        email: 'new@demo.test',
        role: 'member',
        password: 'CallerChosen1!',
      });

      expect(result.temporaryPassword).toBeUndefined();
    });
  });

  describe('acceptInvite()', () => {
    it('rejects when no invite matches the token', async () => {
      const { service } = makeService();

      await expect(
        service.acceptInvite('t1', 'bad-token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an already-accepted invite', async () => {
      const dbMock = createDbMock();
      dbMock.limitMock.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'new@demo.test',
          status: 'accepted',
          expiresAt: new Date(Date.now() + 100_000),
        },
      ]);
      const { service } = makeService(dbMock);

      await expect(
        service.acceptInvite('t1', 'token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired invite', async () => {
      const dbMock = createDbMock();
      dbMock.limitMock.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'new@demo.test',
          status: 'pending',
          expiresAt: new Date(Date.now() - 1000),
        },
      ]);
      const { service } = makeService(dbMock);

      await expect(
        service.acceptInvite('t1', 'token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the invited email no longer maps to a user', async () => {
      const dbMock = createDbMock();
      dbMock.limitMock.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'new@demo.test',
          status: 'pending',
          expiresAt: new Date(Date.now() + 100_000),
        },
      ]);
      const { service, usersService } = makeService(dbMock);
      usersService.findByEmail.mockResolvedValue(undefined);

      await expect(
        service.acceptInvite('t1', 'token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets the password, activates the membership, marks the invite accepted, and returns tokens', async () => {
      const dbMock = createDbMock();
      dbMock.limitMock.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'new@demo.test',
          status: 'pending',
          expiresAt: new Date(Date.now() + 100_000),
        },
      ]);
      const { service, usersService, tenantsService, membershipsService } =
        makeService(dbMock);
      usersService.findByEmail.mockResolvedValue({
        id: 'u2',
        email: 'new@demo.test',
      });
      membershipsService.getMembership.mockResolvedValue({
        role: 'member',
        status: 'active',
      });
      tenantsService.findById.mockResolvedValue({
        id: 't1',
        slug: 'acme',
        schemaName: 'tenant_acme',
        status: 'active',
      });

      const result = await service.acceptInvite(
        't1',
        'token',
        'NewPass123!',
        'New Person',
      );

      expect(usersService.setPassword).toHaveBeenCalledWith(
        'u2',
        'NewPass123!',
      );
      expect(usersService.updateProfile).toHaveBeenCalledWith('u2', {
        fullName: 'New Person',
      });
      expect(membershipsService.activateMembership).toHaveBeenCalledWith(
        't1',
        'u2',
      );
      expect(dbMock.setMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' }),
      );
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
    });
  });
});
