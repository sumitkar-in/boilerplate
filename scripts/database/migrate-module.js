#!/usr/bin/env node
// Applies one module's migrations across all tenants that have it enabled.
// Usage: node migrate-module.js <feature-key>
'use strict';

const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');
// Resolved relative to this file, not process.cwd() — this script may be
// invoked from the repo root (pnpm scripts) or from apps/api (pnpm --filter).
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });
const { Client } = require('pg');
const { applyPendingMigrations } = require('./lib/migration-runner');

async function main() {
  const featureKey = process.argv[2];
  if (!featureKey) {
    console.error('Usage: node migrate-module.js <feature-key>');
    process.exit(1);
  }
  const moduleMigrationsDir = path.join(REPO_ROOT, 'apps/api/src/modules', featureKey, 'migrations');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: tenants } = await client.query(
      `SELECT t.id, t.slug, t.schema_name
       FROM tenants t
       JOIN feature_flags f ON f.tenant_id = t.id
       WHERE f.feature_key = $1 AND f.enabled = true
       ORDER BY t.slug`,
      [featureKey],
    );
    if (tenants.length === 0) {
      console.log(`No tenants have "${featureKey}" enabled — nothing to do.`);
      return;
    }
    for (const tenant of tenants) {
      console.log(`Tenant "${tenant.slug}" (${tenant.schema_name})`);
      await applyPendingMigrations(client, tenant.schema_name, moduleMigrationsDir);
    }
    console.log('Done.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
