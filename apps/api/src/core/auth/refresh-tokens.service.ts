import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { authConfig, type AuthConfig } from '../config';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { refreshTokens } from '../database/schema/core-schema';
import type { TenantRole } from '../tenants/tenant-context';

export type IssuedRefreshToken = {
  token: string;
  expiresAt: Date;
  familyId: string;
};
export type RotatedRefreshToken = IssuedRefreshToken & {
  userId: string;
  tenantId: string | null;
  impersonatedBy: string | null;
  impersonationRole: TenantRole | null;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Opaque (non-JWT) refresh tokens, hashed at rest, grouped into rotation
 * "families". Every /auth/refresh call rotates: the presented token is
 * revoked and a new one issued in the same family. Presenting an
 * already-revoked token (reuse of a stolen/rotated-away token) revokes the
 * whole family — a theft response.
 */
@Injectable()
export class RefreshTokensService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(authConfig.KEY) private readonly auth: AuthConfig,
  ) {}

  async issue(
    userId: string,
    tenantId: string | null,
    familyId?: string,
    impersonation?: { impersonatedBy: string; role: TenantRole },
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );
    const family = familyId ?? randomUUID();
    await this.db.insert(refreshTokens).values({
      userId,
      tenantId,
      impersonatedBy: impersonation?.impersonatedBy,
      impersonationRole: impersonation?.role,
      tokenHash: hashToken(token),
      familyId: family,
      expiresAt,
    });
    return { token, expiresAt, familyId: family };
  }

  async rotate(rawToken: string): Promise<RotatedRefreshToken> {
    const tokenHash = hashToken(rawToken);
    const [existing] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected — session revoked',
      );
    }
    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Atomically claim this token for rotation: the UPDATE only succeeds if
    // revoked_at is still NULL. If a concurrent /auth/refresh call already
    // claimed it, this affects zero rows — treat that as reuse and revoke
    // the whole family, same as presenting an already-revoked token.
    const [claimed] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.id, existing.id), isNull(refreshTokens.revokedAt)),
      )
      .returning({ id: refreshTokens.id });

    if (!claimed) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected — session revoked',
      );
    }

    const issued = await this.issue(
      existing.userId,
      existing.tenantId,
      existing.familyId,
      existing.impersonatedBy && existing.impersonationRole
        ? {
            impersonatedBy: existing.impersonatedBy,
            role: existing.impersonationRole,
          }
        : undefined,
    );
    const [newRow] = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(issued.token)))
      .limit(1);

    await this.db
      .update(refreshTokens)
      .set({ replacedById: newRow?.id })
      .where(eq(refreshTokens.id, existing.id));

    return {
      userId: existing.userId,
      tenantId: existing.tenantId,
      impersonatedBy: existing.impersonatedBy,
      impersonationRole: existing.impersonationRole,
      ...issued,
    };
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }
}
