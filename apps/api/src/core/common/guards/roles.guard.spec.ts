import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  runWithTenantContext,
  type TenantContext,
  type TenantRole,
} from '../../tenants/tenant-context';
import { RolesGuard } from './roles.guard';

function makeContext(role: TenantRole): TenantContext {
  return {
    tenantId: 't1',
    tenantSlug: 'acme',
    schemaName: 'tenant_acme',
    userId: 'u1',
    role,
    roleKey: role,
    permissions: new Set(),
    enabledFeatures: new Set(),
    sessionType: 'tenant',
    isSuperAdmin: false,
  };
}

function makeExecutionContext(): ExecutionContext {
  return {
    getHandler: () => ({}) as unknown,
    getClass: () => ({}) as unknown,
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function withRequiredRoles(roles: TenantRole[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  }

  it('allows the request when no @Roles() metadata is present', () => {
    withRequiredRoles(undefined);
    const ctx = makeExecutionContext();
    expect(
      runWithTenantContext(makeContext('viewer'), () => guard.canActivate(ctx)),
    ).toBe(true);
  });

  it('allows an exact role match', () => {
    withRequiredRoles(['admin']);
    const ctx = makeExecutionContext();
    expect(
      runWithTenantContext(makeContext('admin'), () => guard.canActivate(ctx)),
    ).toBe(true);
  });

  it('allows a higher-ranked role (owner) when admin is required', () => {
    withRequiredRoles(['admin']);
    const ctx = makeExecutionContext();
    expect(
      runWithTenantContext(makeContext('owner'), () => guard.canActivate(ctx)),
    ).toBe(true);
  });

  it('denies a lower-ranked role', () => {
    withRequiredRoles(['admin']);
    const ctx = makeExecutionContext();
    expect(() =>
      runWithTenantContext(makeContext('member'), () => guard.canActivate(ctx)),
    ).toThrow(ForbiddenException);
  });

  it('denies viewer when member is required', () => {
    withRequiredRoles(['member']);
    const ctx = makeExecutionContext();
    expect(() =>
      runWithTenantContext(makeContext('viewer'), () => guard.canActivate(ctx)),
    ).toThrow(ForbiddenException);
  });

  it('allows if the user matches any of multiple allowed roles', () => {
    withRequiredRoles(['owner', 'viewer']);
    const ctx = makeExecutionContext();
    expect(
      runWithTenantContext(makeContext('viewer'), () => guard.canActivate(ctx)),
    ).toBe(true);
  });
});
