import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authConfig, type AuthConfig } from '../config';
import type { TenantRole } from '../tenants/tenant-context';
import type { UserRecord } from '../users/users.service';
import { RefreshTokensService } from './refresh-tokens.service';
import type { AccessTokenPayload } from './jwt-payload';

export type AuthTokens = { accessToken: string; refreshToken: string };
export type SessionOptions = {
  sessionType?: 'tenant' | 'platform' | 'impersonation';
  impersonatedBy?: string;
};

/**
 * Issues access/refresh token pairs. Split out of AuthService so every
 * login path (password, 2FA, refresh, impersonation) shares one place
 * that knows the access-token payload shape and TTL.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
  ) {}

  issueAccessToken(
    userId: string,
    tenantId: string | undefined,
    tenantSlug: string | undefined,
    role: TenantRole,
    options: SessionOptions = {},
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: userId,
      tenantId,
      tenantSlug,
      role,
      sessionType: options.sessionType ?? 'tenant',
      impersonatedBy: options.impersonatedBy,
      purpose: 'access',
    };
    // Seconds, not a duration string — avoids fighting @nestjs/jwt's
    // StringValue literal-type for `expiresIn` when the value comes from env.
    return this.jwtService.signAsync(payload, {
      expiresIn: this.auth.accessTokenTtlSeconds,
    });
  }

  async issueFullSession(
    user: UserRecord,
    tenantId: string | null,
    tenantSlug: string | undefined,
    role: TenantRole,
    options: SessionOptions = {},
  ): Promise<AuthTokens> {
    const accessToken = await this.issueAccessToken(
      user.id,
      tenantId ?? undefined,
      tenantSlug,
      role,
      options,
    );
    const impersonation =
      options.sessionType === 'impersonation' && options.impersonatedBy
        ? { impersonatedBy: options.impersonatedBy, role }
        : undefined;
    const { token: refreshToken } = impersonation
      ? await this.refreshTokensService.issue(
          user.id,
          tenantId,
          undefined,
          impersonation,
        )
      : await this.refreshTokensService.issue(user.id, tenantId);
    return { accessToken, refreshToken };
  }
}
