import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.providers';
import {
  applyPendingMigrations,
  toSafeSchemaName,
} from '../database/tenant-migration-runner';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { TenantRolesService } from './tenant-roles.service';
import { TenantsService, type TenantRecord } from './tenants.service';

// dist/core/tenants -> dist/modules (see apps/api/nest-cli.json's "assets"
// entry, which copies modules/**/feature.json and modules/**/migrations
// into dist so this resolves the same way in the dockerized API image,
// which ships dist/ only, as it does under `pnpm dev:api`).
const MODULES_DIR = join(__dirname, '../../modules');
// drizzle/tenant/ lives at the repo root, outside apps/api entirely, so it
// is NOT shipped inside the dockerized API image — applyPendingMigrations()
// no-ops if this path doesn't exist rather than throwing. Empty today
// (core/tenants has no tenant-schema migrations of its own yet), so that
// no-op is behaviorally identical to the CLI (`pnpm tenant:create`) either way.
const TENANT_MIGRATIONS_DIR = join(__dirname, '../../../../../drizzle/tenant');

export type AvailableModule = { key: string; label: string };

/**
 * HTTP-triggered counterpart to scripts/database/create-tenant.js
 * (the CLI script) — same schema-creation + migration-application steps,
 * exposed via admin-tenants.controller.ts (SuperAdminGuard) instead of
 * `pnpm tenant:create`. Both paths are kept intentionally parallel; see
 * apps/api/src/core/database/tenant-migration-runner.ts's docblock.
 */
@Injectable()
export class TenantProvisioningService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly tenantsService: TenantsService,
    private readonly tenantRolesService: TenantRolesService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async requireActiveTenantBySlug(slug: string): Promise<TenantRecord> {
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant || tenant.status !== 'active') {
      throw new NotFoundException(`Tenant "${slug}" not found`);
    }
    return tenant;
  }

  /** Reads modules/*\/feature.json — the same set `pnpm tenant:create --features=` accepts. */
  listAvailableModules(): AvailableModule[] {
    if (!existsSync(MODULES_DIR)) return [];
    return readdirSync(MODULES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const featureJsonPath = join(MODULES_DIR, entry.name, 'feature.json');
        if (!existsSync(featureJsonPath)) return [];
        const manifest = JSON.parse(readFileSync(featureJsonPath, 'utf8')) as {
          key: string;
          label: string;
        };
        return [{ key: manifest.key, label: manifest.label }];
      });
  }

  async provisionTenant(
    slug: string,
    features: string[],
  ): Promise<TenantRecord> {
    const normalizedSlug = slug.toLowerCase();
    if (await this.tenantsService.findBySlug(normalizedSlug)) {
      throw new BadRequestException(
        `Tenant "${normalizedSlug}" already exists`,
      );
    }
    const schemaName = toSafeSchemaName(normalizedSlug);

    const tenant = await this.tenantsService.create({
      slug: normalizedSlug,
      schemaName,
    });
    await this.tenantRolesService.seedDefaultRoles(tenant.id);

    const client = await this.pool.connect();
    try {
      await applyPendingMigrations(client, schemaName, TENANT_MIGRATIONS_DIR);
      for (const featureKey of features) {
        await applyPendingMigrations(
          client,
          schemaName,
          join(MODULES_DIR, featureKey, 'migrations'),
        );
      }
    } finally {
      client.release();
    }

    for (const featureKey of features) {
      await this.featureFlagsService.setEnabled(tenant.id, featureKey, true);
    }

    return tenant;
  }

  async applyFeatureMigrations(
    tenantId: string,
    featureKey: string,
  ): Promise<void> {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) return;
    const client = await this.pool.connect();
    try {
      await applyPendingMigrations(
        client,
        tenant.schemaName,
        join(MODULES_DIR, featureKey, 'migrations'),
      );
    } finally {
      client.release();
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const client = await this.pool.connect();
    try {
      await client.query(
        `DROP SCHEMA IF EXISTS "${tenant.schemaName}" CASCADE`,
      );
      await client.query('DELETE FROM refresh_tokens WHERE tenant_id = $1', [
        tenant.id,
      ]);
      await client.query('DELETE FROM invites WHERE tenant_id = $1', [
        tenant.id,
      ]);
      await client.query('DELETE FROM audit_logs WHERE tenant_id = $1', [
        tenant.id,
      ]);
      await client.query('DELETE FROM feature_flags WHERE tenant_id = $1', [
        tenant.id,
      ]);
      await client.query(
        'DELETE FROM tenant_memberships WHERE tenant_id = $1',
        [tenant.id],
      );
      await client.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
    } finally {
      client.release();
    }
  }
}
