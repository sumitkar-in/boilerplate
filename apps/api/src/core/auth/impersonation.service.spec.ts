import { UnauthorizedException } from '@nestjs/common';
import { ImpersonationService } from './impersonation.service';

function createDeps() {
  const usersService = { findById: jest.fn() };
  const tenantsService = { findById: jest.fn() };
  const membershipsService = { getMembership: jest.fn() };
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

function makeService() {
  const deps = createDeps();
  const service = new ImpersonationService(
    deps.usersService as never,
    deps.tenantsService as never,
    deps.membershipsService as never,
    deps.tokenService as never,
    deps.auditLogService as never,
  );
  return { service, ...deps };
}

const superAdmin = { id: 'admin-1', isSuperAdmin: true, isActive: true };
const targetUser = { id: 'u2', isActive: true };
const tenant = {
  id: 't1',
  slug: 'acme',
  schemaName: 'tenant_acme',
  status: 'active',
};
const activeMembership = { role: 'member' as const, status: 'active' as const };

describe('ImpersonationService', () => {
  it('rejects a caller who is not an active super admin', async () => {
    const { service, usersService, tenantsService, membershipsService } =
      makeService();
    usersService.findById.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'admin-1' ? { ...superAdmin, isSuperAdmin: false } : targetUser,
      ),
    );
    tenantsService.findById.mockResolvedValue(tenant);
    membershipsService.getMembership.mockResolvedValue(activeMembership);

    await expect(
      service.impersonateTenantUser({
        superAdminId: 'admin-1',
        tenantId: 't1',
        userId: 'u2',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects impersonating a target user with no active membership', async () => {
    const { service, usersService, tenantsService, membershipsService } =
      makeService();
    usersService.findById.mockImplementation((id: string) =>
      Promise.resolve(id === 'admin-1' ? superAdmin : targetUser),
    );
    tenantsService.findById.mockResolvedValue(tenant);
    membershipsService.getMembership.mockResolvedValue(undefined);

    await expect(
      service.impersonateTenantUser({
        superAdminId: 'admin-1',
        tenantId: 't1',
        userId: 'u2',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('always issues a viewer-scoped impersonation session regardless of the target role', async () => {
    const {
      service,
      usersService,
      tenantsService,
      membershipsService,
      tokenService,
      auditLogService,
    } = makeService();
    usersService.findById.mockImplementation((id: string) =>
      Promise.resolve(id === 'admin-1' ? superAdmin : targetUser),
    );
    tenantsService.findById.mockResolvedValue(tenant);
    membershipsService.getMembership.mockResolvedValue({
      role: 'owner',
      status: 'active',
    });

    const result = await service.impersonateTenantUser({
      superAdminId: 'admin-1',
      tenantId: 't1',
      userId: 'u2',
    });

    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      refreshToken: 'raw-refresh-token',
    });
    expect(tokenService.issueFullSession).toHaveBeenCalledWith(
      targetUser,
      't1',
      'acme',
      'viewer',
      { sessionType: 'impersonation', impersonatedBy: 'admin-1' },
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        userId: 'admin-1',
        action: 'auth.impersonate_view',
      }),
    );
  });
});
