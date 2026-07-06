import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_RANK, type TenantRole } from '@boilerplate/contracts';
import { getTenantContext } from '../../tenants/tenant-context';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Reads @Roles() metadata and checks it against the current
 * TenantContext.role — populated post-auth by TenantContextInterceptor, so
 * (like FeatureFlagGuard) this guard does no DB lookups of its own.
 * @Roles('admin') also allows 'owner' via ROLE_RANK. See: skills/tenant-data-access/SKILL.md
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      TenantRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const tenant = getTenantContext();
    const minRequiredRank = Math.min(
      ...requiredRoles.map((role) => ROLE_RANK[role]),
    );
    if (ROLE_RANK[tenant.role] < minRequiredRank) {
      throw new ForbiddenException(
        `Requires one of role(s): ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
