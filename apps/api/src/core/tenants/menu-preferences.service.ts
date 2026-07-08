import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull, sql } from 'drizzle-orm';
import {
  CORE_MENU_KEYS,
  PLATFORM_MENU_KEYS,
  type CustomMenuItem,
} from '@boilerplate/contracts';
import { CacheService, CACHE_TTLS } from '../cache/cache.service';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { menuPreferences } from '../database/schema/core-schema';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

/**
 * Global and per-tenant sidebar menu ordering. Split out of TenantsService
 * as its own bounded concern — depends on FeatureFlagsService (not
 * TenantsService) to know which feature-module menu entries a tenant may
 * reorder.
 */
@Injectable()
export class MenuPreferencesService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly cache?: CacheService,
  ) {}

  async getMenuOrder(tenantId?: string | null): Promise<CustomMenuItem[]> {
    const cacheKey = tenantId
      ? `tenant:${tenantId}:menu-order`
      : 'tenant:global:menu-order';
    return this.remember(cacheKey, CACHE_TTLS.long, async () => {
      if (tenantId) {
        const [tenantPreference] = await this.db
          .select({ itemOrder: menuPreferences.itemOrder })
          .from(menuPreferences)
          .where(eq(menuPreferences.tenantId, tenantId))
          .limit(1);
        if (tenantPreference)
          return tenantPreference.itemOrder as CustomMenuItem[];
      }

      const [globalPreference] = await this.db
        .select({ itemOrder: menuPreferences.itemOrder })
        .from(menuPreferences)
        .where(isNull(menuPreferences.tenantId))
        .limit(1);
      return (
        (globalPreference?.itemOrder as CustomMenuItem[] | undefined) ?? []
      );
    });
  }

  async updateGlobalMenuOrder(itemOrder: CustomMenuItem[], updatedBy: string) {
    const sanitized = this.sanitizeMenuOrder(itemOrder, [
      ...CORE_MENU_KEYS,
      ...PLATFORM_MENU_KEYS,
    ]);
    await this.db.execute(sql`
      INSERT INTO menu_preferences (tenant_id, item_order, updated_by, updated_at)
      VALUES (NULL, ${JSON.stringify(sanitized)}::jsonb, ${updatedBy}, now())
      ON CONFLICT ((tenant_id IS NULL)) WHERE tenant_id IS NULL
      DO UPDATE SET item_order = EXCLUDED.item_order, updated_by = EXCLUDED.updated_by, updated_at = now()
    `);
    await this.cache?.del('tenant:global:menu-order');
    return { itemOrder: sanitized };
  }

  async updateTenantMenuOrder(
    tenantId: string,
    itemOrder: CustomMenuItem[],
    updatedBy: string,
  ) {
    const featureKeys = Array.from(
      await this.featureFlagsService.getEnabledFeatureKeys(tenantId),
    );
    const sanitized = this.sanitizeMenuOrder(itemOrder, [
      ...CORE_MENU_KEYS,
      ...featureKeys,
    ]);
    await this.db.execute(sql`
      INSERT INTO menu_preferences (tenant_id, item_order, updated_by, updated_at)
      VALUES (${tenantId}, ${JSON.stringify(sanitized)}::jsonb, ${updatedBy}, now())
      ON CONFLICT (tenant_id) WHERE tenant_id IS NOT NULL
      DO UPDATE SET item_order = EXCLUDED.item_order, updated_by = EXCLUDED.updated_by, updated_at = now()
    `);
    await this.cache?.del(`tenant:${tenantId}:menu-order`);
    return { itemOrder: sanitized };
  }

  private sanitizeMenuOrder(
    itemOrder: CustomMenuItem[],
    availableKeys: string[],
  ): CustomMenuItem[] {
    const available = new Set(availableKeys);
    const seen = new Set<string>();

    const sanitize = (items: CustomMenuItem[]): CustomMenuItem[] => {
      const sanitizedItems: CustomMenuItem[] = [];
      for (const item of items) {
        if (seen.has(item.id)) continue;

        const isAvailableModule = available.has(item.id);
        const isCustomFolder = item.id.startsWith('custom-');

        if (!isAvailableModule && !isCustomFolder) continue;

        seen.add(item.id);

        const sanitizedItem: CustomMenuItem = {
          id: item.id,
          label: item.label,
          icon: item.icon,
          hidden: item.hidden,
        };

        if (item.children && Array.isArray(item.children)) {
          sanitizedItem.children = sanitize(item.children);
        }

        sanitizedItems.push(sanitizedItem);
      }
      return sanitizedItems;
    };

    return sanitize(itemOrder);
  }

  private async remember<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.cache?.remember(key, ttlSeconds, loader);
    if (cached) return await cached;
    return await loader();
  }
}
