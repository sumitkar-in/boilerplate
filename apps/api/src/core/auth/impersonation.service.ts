import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditLogService } from '../common/audit-log.service';
import { MembershipsService } from '../tenants/memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import type { AuthTokens } from './token.service';
import { TokenService } from './token.service';

/**
 * Super-admin "view as tenant user" sessions — always issued at 'viewer'
 * role regardless of the target user's real role, since impersonation is
 * for support/debugging, not for acting on the tenant's behalf. Split out
 * of AuthService as its own bounded concern.
 */
@Injectable()
export class ImpersonationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async impersonateTenantUser(input: {
    superAdminId: string;
    tenantId: string;
    userId: string;
  }): Promise<AuthTokens> {
    const [superAdmin, targetUser, tenant, membership] = await Promise.all([
      this.usersService.findById(input.superAdminId),
      this.usersService.findById(input.userId),
      this.tenantsService.findById(input.tenantId),
      this.membershipsService.getMembership(input.tenantId, input.userId),
    ]);

    if (!superAdmin?.isSuperAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException('Requires super admin');
    }
    if (
      !targetUser ||
      !targetUser.isActive ||
      !tenant ||
      tenant.status !== 'active' ||
      !membership ||
      membership.status !== 'active'
    ) {
      throw new UnauthorizedException('Cannot impersonate this user');
    }

    await this.auditLogService.log({
      tenantId: tenant.id,
      userId: input.superAdminId,
      action: 'auth.impersonate_view',
      metadata: { impersonatedUserId: targetUser.id },
    });

    return this.tokenService.issueFullSession(
      targetUser,
      tenant.id,
      tenant.slug,
      'viewer',
      {
        sessionType: 'impersonation',
        impersonatedBy: input.superAdminId,
      },
    );
  }
}
