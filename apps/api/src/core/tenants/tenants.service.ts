import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, or, sql, type SQL } from 'drizzle-orm';
import { CacheService, CACHE_TTLS } from '../cache/cache.service';
import { CORE_DB, type CoreDb } from '../database/database.providers';
import { tenantMemberships, tenants } from '../database/schema/core-schema';
import type { QueryTenantsDto } from './dto/query-tenants.dto';
import type { TenantSettingsPayload } from './dto/update-tenant-settings.dto';

export type TenantRecord = typeof tenants.$inferSelect;
export type TenantListRecord = Pick<
  TenantRecord,
  'id' | 'slug' | 'schemaName' | 'status' | 'createdAt' | 'updatedAt'
> & { memberCount: number };

export const DEFAULT_TENANT_SETTINGS: Required<TenantSettingsPayload> = {
  general: {
    timezone: 'UTC',
    locale: 'en',
    dateFormat: 'MMM d, yyyy',
    currency: 'USD',
    weekStartsOn: 'monday',
  },
  dashboard: {
    title: 'Workspace overview',
    subtitle: 'Track your tenant, modules, and shortcuts from one place.',
    defaultRange: '30d',
    widgets: ['tenant', 'role', 'modules', 'quickLinks'],
    quickLinkLimit: 6,
  },
  navigation: {
    defaultCollapsed: false,
    moduleGrouping: 'category',
    showSearch: true,
  },
  notifications: {
    fromEmail: '',
    digestFrequency: 'weekly',
    enableInApp: true,
    enableEmail: false,
  },
  security: {
    requireTwoFactor: false,
    sessionTimeoutMinutes: 480,
    allowedDomains: [],
  },
  integrations: {
    webhookUrl: '',
    supportEmail: '',
    aiModel: 'qwen3:0.6b',
  },
  data: {
    retentionDays: 365,
    exportFormat: 'csv',
  },
};

export function mergeTenantSettings(
  settings: TenantSettingsPayload | null | undefined,
): Required<TenantSettingsPayload> {
  return {
    general: { ...DEFAULT_TENANT_SETTINGS.general, ...settings?.general },
    dashboard: { ...DEFAULT_TENANT_SETTINGS.dashboard, ...settings?.dashboard },
    navigation: {
      ...DEFAULT_TENANT_SETTINGS.navigation,
      ...settings?.navigation,
    },
    notifications: {
      ...DEFAULT_TENANT_SETTINGS.notifications,
      ...settings?.notifications,
    },
    security: { ...DEFAULT_TENANT_SETTINGS.security, ...settings?.security },
    integrations: {
      ...DEFAULT_TENANT_SETTINGS.integrations,
      ...settings?.integrations,
    },
    data: { ...DEFAULT_TENANT_SETTINGS.data, ...settings?.data },
  };
}

/**
 * Tenant record CRUD and branding/settings only — membership, role, and
 * menu-order concerns live in sibling services (MembershipsService,
 * TenantRolesService, MenuPreferencesService) so this file stays a single
 * responsibility.
 */
@Injectable()
export class TenantsService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly cache?: CacheService,
  ) {}

  async findBySlug(slug: string): Promise<TenantRecord | undefined> {
    return this.remember(`tenant:slug:${slug}`, CACHE_TTLS.long, async () => {
      const [tenant] = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);
      return tenant;
    });
  }

  async findById(id: string): Promise<TenantRecord | undefined> {
    return this.remember(`tenant:${id}:record`, CACHE_TTLS.long, async () => {
      const [tenant] = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);
      return tenant;
    });
  }

  // Platform-wide — see admin-tenants.controller.ts (SuperAdminGuard).
  async listAll(query: QueryTenantsDto = {}): Promise<{
    rows: TenantListRecord[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const conditions: SQL[] = [];
    const search = query.search?.trim();
    if (search) {
      const term = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
      conditions.push(
        or(
          sql`${tenants.slug} ILIKE ${term}`,
          sql`${tenants.companyName} ILIKE ${term}`,
        )!,
      );
    }
    if (query.status) conditions.push(eq(tenants.status, query.status));
    const where = conditions.length ? and(...conditions) : undefined;

    const sortDir = query.sortDir ?? 'asc';
    const sortColumn =
      query.sortBy === 'status'
        ? tenants.status
        : query.sortBy === 'createdAt'
          ? tenants.createdAt
          : query.sortBy === 'memberCount'
            ? sql`count(${tenantMemberships.id})`
            : tenants.slug;
    const orderBy = sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const rows = await this.db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        schemaName: tenants.schemaName,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        memberCount: count(tenantMemberships.id),
      })
      .from(tenants)
      .leftJoin(tenantMemberships, eq(tenantMemberships.tenantId, tenants.id))
      .where(where)
      .groupBy(tenants.id)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(tenants)
      .where(where);

    return { rows, total, limit, offset };
  }

  async updateStatus(
    tenantId: string,
    status: TenantRecord['status'],
  ): Promise<void> {
    await this.db
      .update(tenants)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    await this.invalidateTenant(tenantId);
  }

  // Pre-auth, public — only the fields needed to brand the login screen.
  // Never expose more than this without a role check; see getSettings().
  async getPublicBranding(tenantId: string) {
    return this.remember(
      `tenant:${tenantId}:public-branding`,
      CACHE_TTLS.long,
      async () => {
        const [tenant] = await this.db
          .select({
            companyName: tenants.companyName,
            brandColor: tenants.brandColor,
            logoUrl: tenants.logoUrl,
            settings: tenants.settings,
          })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
        return tenant;
      },
    );
  }

  async getPublicBrandingBySlug(slug: string) {
    const tenant = await this.findBySlug(slug);
    if (!tenant || tenant.status !== 'active') return null;
    return this.getPublicBranding(tenant.id);
  }

  async getSettings(tenantId: string) {
    return this.remember(
      `tenant:${tenantId}:settings`,
      CACHE_TTLS.medium,
      async () => {
        const [tenant] = await this.db
          .select({
            tenantId: tenants.id,
            tenantSlug: tenants.slug,
            companyName: tenants.companyName,
            brandColor: tenants.brandColor,
            logoUrl: tenants.logoUrl,
            settings: tenants.settings,
          })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
        return tenant
          ? {
              ...tenant,
              settings: mergeTenantSettings(
                tenant.settings as TenantSettingsPayload,
              ),
            }
          : tenant;
      },
    );
  }

  async updateSettings(
    tenantId: string,
    input: {
      companyName?: string;
      brandColor?: string;
      logoUrl?: string;
      settings?: TenantSettingsPayload;
    },
  ) {
    const current = await this.getSettings(tenantId);
    const mergedSettings = mergeTenantSettings({
      ...current?.settings,
      ...input.settings,
      general: { ...current?.settings.general, ...input.settings?.general },
      dashboard: {
        ...current?.settings.dashboard,
        ...input.settings?.dashboard,
      },
      navigation: {
        ...current?.settings.navigation,
        ...input.settings?.navigation,
      },
      notifications: {
        ...current?.settings.notifications,
        ...input.settings?.notifications,
      },
      security: { ...current?.settings.security, ...input.settings?.security },
      integrations: {
        ...current?.settings.integrations,
        ...input.settings?.integrations,
      },
      data: { ...current?.settings.data, ...input.settings?.data },
    });
    const [tenant] = await this.db
      .update(tenants)
      .set({
        companyName:
          input.companyName !== undefined
            ? input.companyName.trim() || null
            : current?.companyName,
        brandColor: input.brandColor ?? current?.brandColor ?? '#35abc0',
        logoUrl:
          input.logoUrl !== undefined
            ? input.logoUrl.trim() || null
            : current?.logoUrl,
        settings: mergedSettings,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning({
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        companyName: tenants.companyName,
        brandColor: tenants.brandColor,
        logoUrl: tenants.logoUrl,
        settings: tenants.settings,
      });
    await this.invalidateTenant(tenantId);
    return tenant
      ? {
          ...tenant,
          settings: mergeTenantSettings(
            tenant.settings as TenantSettingsPayload,
          ),
        }
      : tenant;
  }

  async create(input: {
    slug: string;
    schemaName: string;
  }): Promise<TenantRecord> {
    const [tenant] = await this.db
      .insert(tenants)
      .values({ slug: input.slug, schemaName: input.schemaName })
      .returning();
    return tenant;
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

  private async invalidateTenant(tenantId: string): Promise<void> {
    await this.cache?.deleteByPattern(`tenant:${tenantId}:*`);
  }
}
