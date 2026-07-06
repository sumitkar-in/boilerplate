import type { Request } from 'express';
import { canAccessNestLens } from './nestlens-access';
import type { TenantContext } from '../tenants/tenant-context';

describe('canAccessNestLens', () => {
  it('denies unauthenticated requests', () => {
    expect(canAccessNestLens({} as Request)).toBe(false);
  });

  it('denies non-super-admin users', () => {
    const req = {
      user: {
        isSuperAdmin: false,
        userId: 'user-1',
      } as TenantContext,
    } as Request & { user: TenantContext };

    expect(canAccessNestLens(req)).toBe(false);
  });

  it('allows authenticated super admins', () => {
    const req = {
      user: {
        isSuperAdmin: true,
        userId: 'admin-1',
      } as TenantContext,
    } as Request & { user: TenantContext };

    expect(canAccessNestLens(req)).toEqual({
      id: 'admin-1',
      roles: ['super-admin'],
    });
  });
});
