import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../rbac/permissions';
import { MembershipsService } from '../tenants/memberships.service';
import { runWithTenantContext } from '../tenants/tenant-context';
import type { TenantContext, TenantRole } from '../tenants/tenant-context';
import { TenantRolesService } from '../tenants/tenant-roles.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import type { AccessTokenPayload } from './jwt-payload';

/**
 * Verifies the access token (if present) and — critically — wraps the
 * REST of the request pipeline (guards, interceptors, the controller
 * handler) in runWithTenantContext(). This has to happen here, in
 * middleware, not in a guard: Node's AsyncLocalStorage.enterWith(), called
 * inside an awaited guard's canActivate(), does NOT propagate to the code
 * that awaited it — the store a `.then()` continuation sees is fixed by
 * what was active when the promise was created (i.e. before the guard
 * ran), not by what the guard did internally afterward. Wrapping `next()`
 * here works because Express's middleware chain invokes the rest of the
 * pipeline synchronously, from within this call — everything Nest does
 * downstream (guards/interceptors/handler) is newly created as a result
 * of that call, so it correctly inherits the store.
 *
 * JwtAuthGuard only checks that `request.user` was set here — it doesn't
 * do verification itself.
 */
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly tenantRolesService: TenantRolesService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly usersService: UsersService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = this.extractToken(req);
    if (!token) {
      next();
      return;
    }

    this.buildContext(token).then(
      (context) => {
        if (!context) {
          next();
          return;
        }
        (req as Request & { user?: TenantContext }).user = context;
        runWithTenantContext(context, () => next());
      },
      () => next(),
    );
  }

  private extractToken(req: Request): string | undefined {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }

  private async buildContext(
    token: string,
  ): Promise<TenantContext | undefined> {
    const payload =
      await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    if (payload.purpose !== 'access') return undefined;

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) return undefined;

    if (payload.sessionType === 'platform') {
      if (!user.isSuperAdmin) return undefined;
      return {
        tenantId: '',
        tenantSlug: '',
        schemaName: '',
        userId: payload.sub,
        role: 'owner',
        roleKey: 'owner',
        permissions: new Set(DEFAULT_ROLE_PERMISSIONS.owner),
        enabledFeatures: new Set(),
        isSuperAdmin: true,
        sessionType: 'platform',
      };
    }

    if (!payload.tenantId) return undefined;

    const tenant = await this.tenantsService.findById(payload.tenantId);
    if (!tenant || tenant.status !== 'active') return undefined;

    // A super admin has owner-level access to every tenant without a
    // tenant_memberships row — re-checked from the DB on every request
    // (not trusted from the token), same as a normal membership's role/
    // status, so revoking either takes effect immediately rather than
    // waiting for the access token to expire.
    let role: TenantRole;
    let roleKey: string;
    let permissions: Set<string>;
    if (payload.sessionType === 'impersonation') {
      role = 'viewer';
      roleKey = 'viewer';
      permissions = new Set(DEFAULT_ROLE_PERMISSIONS.viewer);
    } else if (user.isSuperAdmin) {
      role = 'owner';
      roleKey = 'owner';
      permissions = new Set(DEFAULT_ROLE_PERMISSIONS.owner);
    } else {
      const membership = await this.membershipsService.getMembership(
        payload.tenantId,
        payload.sub,
      );
      if (!membership || membership.status !== 'active') return undefined;
      role = membership.role;
      roleKey = membership.roleKey;
      permissions = new Set(
        await this.tenantRolesService.getRolePermissions(
          payload.tenantId,
          membership.roleKey,
        ),
      );
    }

    const enabledFeatures =
      await this.featureFlagsService.getEnabledFeatureKeys(payload.tenantId);

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      schemaName: tenant.schemaName,
      userId: payload.sub,
      role,
      roleKey,
      permissions,
      enabledFeatures,
      isSuperAdmin: user.isSuperAdmin,
      sessionType: payload.sessionType ?? 'tenant',
      impersonatedBy: payload.impersonatedBy,
    };
  }
}
