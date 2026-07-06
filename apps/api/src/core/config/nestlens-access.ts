import type { Request } from 'express';
import type { AuthUser } from 'nestlens';
import type { TenantContext } from '../tenants/tenant-context';

export function canAccessNestLens(
  req: Request & { user?: TenantContext },
): false | AuthUser {
  const user = req.user;
  if (!user?.isSuperAdmin) return false;

  return {
    id: user.userId,
    roles: ['super-admin'],
  };
}
