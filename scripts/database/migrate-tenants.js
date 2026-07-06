#!/usr/bin/env node
// Applies drizzle/tenant migrations + each enabled module's migrations
// to every existing tenant schema.
'use strict';

const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');
// Resolved relative to this file, not process.cwd() — this script may be
// invoked from the repo root (pnpm scripts) or from apps/api (pnpm --filter).
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });
const { Client } = require('pg');
const { applyPendingMigrations } = require('./lib/migration-runner');

const TENANT_MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle/tenant');
const MODULES_DIR = path.join(REPO_ROOT, 'apps/api/src/modules');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: tenants } = await client.query(
      'SELECT id, slug, schema_name FROM tenants ORDER BY slug',
    );
    if (tenants.length === 0) {
      console.log('No tenants found — nothing to do.');
      return;
    }

    for (const tenant of tenants) {
      console.log(`\nTenant "${tenant.slug}" (${tenant.schema_name})`);
      await applyPendingMigrations(client, tenant.schema_name, TENANT_MIGRATIONS_DIR);

      const { rows: flags } = await client.query(
        'SELECT feature_key FROM feature_flags WHERE tenant_id = $1 AND enabled = true',
        [tenant.id],
      );
      for (const { feature_key: featureKey } of flags) {
        const moduleMigrationsDir = path.join(MODULES_DIR, featureKey, 'migrations');
        await applyPendingMigrations(client, tenant.schema_name, moduleMigrationsDir);
      }
    }
    console.log('\nDone.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
