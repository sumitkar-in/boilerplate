import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '../../rbac/permissions';
import { getTenantContext } from '../../tenants/tenant-context';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const tenant = getTenantContext();
    const allowed = required.every((permission) =>
      hasPermission(tenant.permissions, permission),
    );
    if (!allowed) {
      throw new ForbiddenException(
        `Requires permission(s): ${required.join(', ')}`,
      );
    }
    return true;
  }
}
