import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../common/audit-log.service';
import { authConfig, type AuthConfig } from '../config';
import { MembershipsService } from '../tenants/memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import type { TenantRole } from '../tenants/tenant-context';
import { UsersService, type UserRecord } from '../users/users.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { TokenService, type AuthTokens } from './token.service';
import type { TwoFactorPendingPayload } from './jwt-payload';

export type LoginResult =
  | { twoFactorRequired: true; partialToken: string }
  | ({
      twoFactorRequired: false;
      // Set when the tenant's security.requireTwoFactor setting is on and
      // this user hasn't enabled 2FA yet. Login still succeeds (blocking it
      // outright would strand the first owner, who needs a session to reach
      // /auth/2fa/setup) — the frontend is expected to force the setup flow
      // before letting the user past this point. See tenants.service.ts's
      // DEFAULT_TENANT_SETTINGS.security.requireTwoFactor.
      twoFactorSetupRequired?: boolean;
    } & AuthTokens);

/**
 * Core session lifecycle: password login (tenant and super-admin),
 * refresh, and logout. 2FA login completion, invites, impersonation, and
 * token issuance live in sibling services (TwoFactorAuthService,
 * InvitesService, ImpersonationService, TokenService) — this file only
 * owns "how does a session get established or renewed".
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: MembershipsService,
    private readonly tokenService: TokenService,
    private readonly refreshTokensService: RefreshTokensService,
    private readonly auditLogService: AuditLogService,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
  ) {}

  /**
   * A super admin has owner-level access to every tenant without a
   * tenant_memberships row — this is the single place that bypass is
   * applied; every login/refresh path goes through it instead of reading
   * membership.role directly. See core/auth/auth-context.middleware.ts for
   * the equivalent check on subsequent (non-login) requests.
   */
  private async resolveRole(
    user: UserRecord,
    tenantId: string,
  ): Promise<TenantRole | undefined> {
    if (user.isSuperAdmin) return 'owner';
    const membership = await this.membershipsService.getMembership(
      tenantId,
      user.id,
    );
    if (!membership || membership.status !== 'active') return undefined;
    return membership.role;
  }

  async loginSuperAdmin(email: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive || !user.isSuperAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await this.usersService.verifyPassword(
      user,
      password,
    );
    if (!validPassword) throw new UnauthorizedException('Invalid credentials');

    await this.auditLogService.log({
      tenantId: null,
      userId: user.id,
      action: 'auth.super_admin_login',
    });

    if (user.twoFactorEnabled) {
      const payload: TwoFactorPendingPayload = {
        sub: user.id,
        sessionType: 'platform',
        purpose: '2fa-pending',
      };
      const partialToken = await this.jwtService.signAsync(payload, {
        expiresIn: this.auth.twoFactorPendingTtlSeconds,
      });
      return { twoFactorRequired: true, partialToken };
    }

    const tokens = await this.tokenService.issueFullSession(
      user,
      null,
      undefined,
      'owner',
      { sessionType: 'platform' },
    );
    return { twoFactorRequired: false, ...tokens };
  }

  async login(
    tenantId: string,
    tenantSlug: string,
    email: string,
    password: string,
  ): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const validPassword = await this.usersService.verifyPassword(
      user,
      password,
    );
    if (!validPassword) throw new UnauthorizedException('Invalid credentials');

    const role = await this.resolveRole(user, tenantId);
    if (!role) throw new UnauthorizedException('Invalid credentials');

    await this.auditLogService.log({
      tenantId,
      userId: user.id,
      action: 'auth.login',
    });

    if (user.twoFactorEnabled) {
      const payload: TwoFactorPendingPayload = {
        sub: user.id,
        tenantId,
        sessionType: 'tenant',
        purpose: '2fa-pending',
      };
      const partialToken = await this.jwtService.signAsync(payload, {
        expiresIn: this.auth.twoFactorPendingTtlSeconds,
      });
      return { twoFactorRequired: true, partialToken };
    }

    const tokens = await this.tokenService.issueFullSession(
      user,
      tenantId,
      tenantSlug,
      role,
    );
    const twoFactorSetupRequired = await this.requiresTwoFactorSetup(
      tenantId,
      user,
    );
    return {
      twoFactorRequired: false,
      ...tokens,
      ...(twoFactorSetupRequired ? { twoFactorSetupRequired } : {}),
    };
  }

  /**
   * True when the tenant mandates 2FA and this user hasn't enabled it.
   * Exported for /auth/me (core/auth/auth.controller.ts) so a session
   * established before the setting was turned on — or via refresh, which
   * doesn't recompute this — still surfaces the requirement on every
   * subsequent check, not just at login.
   */
  async requiresTwoFactorSetup(
    tenantId: string,
    user: UserRecord,
  ): Promise<boolean> {
    if (user.twoFactorEnabled) return false;
    const settings = await this.tenantsService.getSettings(tenantId);
    return settings?.settings.security.requireTwoFactor ?? false;
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const rotated = await this.refreshTokensService.rotate(rawRefreshToken);

    const user = await this.usersService.findById(rotated.userId);
    if (!user || !user.isActive)
      throw new UnauthorizedException('Invalid refresh token');

    if (!rotated.tenantId) {
      if (!user.isSuperAdmin) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const accessToken = await this.tokenService.issueAccessToken(
        user.id,
        undefined,
        undefined,
        'owner',
        { sessionType: 'platform' },
      );
      return { accessToken, refreshToken: rotated.token };
    }

    const [role, tenant] = await Promise.all([
      this.resolveRole(user, rotated.tenantId),
      this.tenantsService.findById(rotated.tenantId),
    ]);
    if (!role || !tenant) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRole =
      rotated.impersonatedBy && rotated.impersonationRole
        ? rotated.impersonationRole
        : role;
    const accessToken = await this.tokenService.issueAccessToken(
      user.id,
      tenant.id,
      tenant.slug,
      tokenRole,
      rotated.impersonatedBy
        ? {
            sessionType: 'impersonation',
            impersonatedBy: rotated.impersonatedBy,
          }
        : { sessionType: 'tenant' },
    );
    return { accessToken, refreshToken: rotated.token };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokensService.revoke(rawRefreshToken);
  }
}
