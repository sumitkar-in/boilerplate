import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../common/audit-log.service';
import { MembershipsService } from '../tenants/memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import type { AuthTokens } from './token.service';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import type { TwoFactorPendingPayload } from './jwt-payload';

/**
 * Completes a login that was paused for 2FA (login()/loginSuperAdmin()
 * returned a partial token instead of a session). Split out of
 * AuthService since it's the login-completion half of 2FA, distinct from
 * TwoFactorService's setup/enable/disable account-management concerns.
 */
@Injectable()
export class TwoFactorAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly twoFactorService: TwoFactorService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async verifyTwoFactorLogin(
    partialToken: string,
    code: string,
  ): Promise<AuthTokens> {
    let payload: TwoFactorPendingPayload;
    try {
      payload =
        await this.jwtService.verifyAsync<TwoFactorPendingPayload>(
          partialToken,
        );
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.purpose !== '2fa-pending') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validCode = await this.twoFactorService.verifyLoginCode(user, code);
    if (!validCode) throw new UnauthorizedException('Invalid two-factor code');

    if (payload.sessionType === 'platform') {
      if (!user.isSuperAdmin) {
        throw new UnauthorizedException('Invalid credentials');
      }
      await this.auditLogService.log({
        tenantId: null,
        userId: user.id,
        action: 'auth.super_admin_2fa_login',
      });
      return this.tokenService.issueFullSession(
        user,
        null,
        undefined,
        'owner',
        {
          sessionType: 'platform',
        },
      );
    }

    if (!payload.tenantId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [role, tenant] = await Promise.all([
      this.resolveRole(user.id, user.isSuperAdmin, payload.tenantId),
      this.tenantsService.findById(payload.tenantId),
    ]);
    if (!role || !tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditLogService.log({
      tenantId: tenant.id,
      userId: user.id,
      action: 'auth.2fa_login',
    });
    return this.tokenService.issueFullSession(
      user,
      tenant.id,
      tenant.slug,
      role,
    );
  }

  /**
   * A super admin has owner-level access to every tenant without a
   * tenant_memberships row — mirrors AuthService.resolveRole for the
   * 2FA-completion path. See core/auth/auth-context.middleware.ts for the
   * equivalent check on subsequent (non-login) requests.
   */
  private async resolveRole(
    userId: string,
    isSuperAdmin: boolean,
    tenantId: string,
  ) {
    if (isSuperAdmin) return 'owner' as const;
    const membership = await this.membershipsService.getMembership(
      tenantId,
      userId,
    );
    if (!membership || membership.status !== 'active') return undefined;
    return membership.role;
  }
}
