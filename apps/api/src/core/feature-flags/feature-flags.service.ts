import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import { CacheService } from '../cache/cache.service';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { featureFlags } from '../database/schema/core-schema';
import { REDIS_CLIENT } from '../redis/redis.providers';

const CACHE_TTL_SECONDS = 60;

function cacheKey(tenantId: string, featureKey: string): string {
  return `flag:${tenantId}:${featureKey}`;
}

/**
 * Backed by `core.feature_flags`, Redis-cached (§7 of the architecture
 * doc). Public interface (isEnabled/setEnabled) is unchanged from the
 * original in-memory placeholder — only the storage changed.
 */
@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cache?: CacheService,
  ) {}

  async isEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    const key = cacheKey(tenantId, featureKey);
    const cached = await this.redis.get(key);
    if (cached !== null) return cached === '1';

    const [row] = await this.db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.tenantId, tenantId),
          eq(featureFlags.featureKey, featureKey),
        ),
      )
      .limit(1);

    const enabled = row?.enabled ?? false;
    await this.redis.set(key, enabled ? '1' : '0', 'EX', CACHE_TTL_SECONDS);
    return enabled;
  }

  async setEnabled(
    tenantId: string,
    featureKey: string,
    enabled: boolean,
    updatedBy?: string,
  ): Promise<void> {
    await this.db
      .insert(featureFlags)
      .values({
        tenantId,
        featureKey,
        enabled,
        enabledAt: enabled ? new Date() : null,
        updatedBy,
      })
      .onConflictDoUpdate({
        target: [featureFlags.tenantId, featureFlags.featureKey],
        set: {
          enabled,
          enabledAt: enabled ? new Date() : null,
          updatedBy,
          updatedAt: new Date(),
        },
      });
    await this.redis.set(
      cacheKey(tenantId, featureKey),
      enabled ? '1' : '0',
      'EX',
      CACHE_TTL_SECONDS,
    );
    await this.cache?.del(`tenant:${tenantId}:features`);
  }

  /** Used to build TenantContext.enabledFeatures post-auth — see core/auth/jwt.strategy.ts. */
  async getEnabledFeatureKeys(tenantId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ featureKey: featureFlags.featureKey })
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.tenantId, tenantId),
          eq(featureFlags.enabled, true),
        ),
      );
    return new Set(rows.map((r) => r.featureKey));
  }

  async listForTenant(tenantId: string): Promise<Map<string, boolean>> {
    const rows = await this.db
      .select({
        featureKey: featureFlags.featureKey,
        enabled: featureFlags.enabled,
      })
      .from(featureFlags)
      .where(eq(featureFlags.tenantId, tenantId));

    return new Map(rows.map((row) => [row.featureKey, row.enabled]));
  }
}
