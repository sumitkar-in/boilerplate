import { randomUUID } from 'node:crypto';
import path from 'node:path';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { DEFAULT_TENANT_ROLES } from '../../src/core/rbac/permissions';

// migration-runner.js is plain CommonJS (run standalone by the CLI scripts
// too) — required directly rather than reimplemented here, same pattern
// used by scripts/database/create-tenant.js.
const {
  toSafeSchemaName,
  applyPendingMigrations,
} = require('../../../../scripts/database/lib/migration-runner');

const REPO_ROOT = path.join(__dirname, '../../../..');
const TENANT_MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle/tenant');
const MODULES_DIR = path.join(REPO_ROOT, 'apps/api/src/modules');

export type TestTenant = {
  tenantId: string;
  slug: string;
  schemaName: string;
  ownerEmail: string;
  ownerPassword: string;
};

/**
 * Provisions a disposable tenant (unique slug per call) directly against
 * the real Postgres instance from infra/docker/docker-compose.yml — same
 * schema-creation + migration path as scripts/database/create-tenant.js,
 * just returning structured data instead of being a CLI script. Always
 * pair with teardownTestTenant() in an afterAll/afterEach.
 */
export async function provisionTestTenant(
  opts: { features?: string[]; ownerPassword?: string } = {},
): Promise<TestTenant> {
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const schemaName = toSafeSchemaName(slug) as string;
  const ownerEmail = `owner-${slug}@e2e.test`;
  const ownerPassword = opts.ownerPassword ?? 'E2ePassw0rd!';
  const features = opts.features ?? [];

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    const { rows: tenantRows } = await client.query(
      'INSERT INTO tenants (slug, schema_name, status) VALUES ($1, $2, $3) RETURNING id',
      [slug, schemaName, 'active'],
    );
    const tenantId = tenantRows[0].id as string;

    // Same default-role seeding as tenant-provisioning.service.ts /
    // scripts/database/create-tenant.js — without it PermissionsGuard
    // denies every role, including owner.
    for (const role of DEFAULT_TENANT_ROLES) {
      await client.query(
        `INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system)
         VALUES ($1, $2, $3, $4, $5::jsonb, true)
         ON CONFLICT (tenant_id, key) DO NOTHING`,
        [
          tenantId,
          role.key,
          role.name,
          role.description,
          JSON.stringify(role.permissions),
        ],
      );
    }

    await applyPendingMigrations(client, schemaName, TENANT_MIGRATIONS_DIR);
    for (const featureKey of features) {
      await applyPendingMigrations(
        client,
        schemaName,
        path.join(MODULES_DIR, featureKey, 'migrations'),
      );
    }

    for (const featureKey of features) {
      await client.query(
        'INSERT INTO feature_flags (tenant_id, feature_key, enabled, enabled_at) VALUES ($1, $2, true, now())',
        [tenantId, featureKey],
      );
    }

    // Low cost factor — this only needs to be "hashed", not production-slow,
    // and e2e suites hash/verify passwords many times per run.
    const passwordHash = await bcrypt.hash(ownerPassword, 4);
    const { rows: userRows } = await client.query(
      'INSERT INTO users (email, password_hash, is_active) VALUES ($1, $2, true) RETURNING id',
      [ownerEmail, passwordHash],
    );
    const ownerId = userRows[0].id as string;

    await client.query(
      // role_key drives permission lookup (defaults to 'member' — leaving
      // it unset silently demotes the owner to member permissions).
      `INSERT INTO tenant_memberships (tenant_id, user_id, role, role_key, status) VALUES ($1, $2, 'owner', 'owner', 'active')`,
      [tenantId, ownerId],
    );

    return { tenantId, slug, schemaName, ownerEmail, ownerPassword };
  } finally {
    await client.end();
  }
}

export async function teardownTestTenant(tenant: TestTenant): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${tenant.schemaName}" CASCADE`);

    const { rows: memberships } = await client.query(
      'SELECT user_id FROM tenant_memberships WHERE tenant_id = $1',
      [tenant.tenantId],
    );

    await client.query(
      'DELETE FROM two_factor_backup_codes WHERE user_id = ANY($1::uuid[])',
      [memberships.map((m) => m.user_id)],
    );
    await client.query('DELETE FROM refresh_tokens WHERE tenant_id = $1', [
      tenant.tenantId,
    ]);
    await client.query('DELETE FROM invites WHERE tenant_id = $1', [
      tenant.tenantId,
    ]);
    await client.query('DELETE FROM audit_logs WHERE tenant_id = $1', [
      tenant.tenantId,
    ]);
    await client.query('DELETE FROM feature_flags WHERE tenant_id = $1', [
      tenant.tenantId,
    ]);
    await client.query('DELETE FROM tenant_memberships WHERE tenant_id = $1', [
      tenant.tenantId,
    ]);
    await client.query('DELETE FROM tenants WHERE id = $1', [tenant.tenantId]);
    if (memberships.length > 0) {
      await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
        memberships.map((m) => m.user_id),
      ]);
    }
  } finally {
    await client.end();
  }
}
