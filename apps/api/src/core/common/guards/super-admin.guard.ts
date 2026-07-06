import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { getTenantContext } from '../../tenants/tenant-context';

/**
 * Restricts a route to platform-wide super admins — distinct from
 * RolesGuard/@Roles('owner'), which only checks rank *within the current
 * tenant* and would also pass a regular tenant owner. Used by
 * admin-tenants.controller.ts, which operates across every tenant, not
 * just the caller's current one.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(): boolean {
    if (!getTenantContext().isSuperAdmin) {
      throw new ForbiddenException('Requires super admin');
    }
    return true;
  }
}
