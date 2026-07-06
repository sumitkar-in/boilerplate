#!/usr/bin/env node
// Provisions a new tenant: CREATE SCHEMA, insert core.tenants row,
// set enabled feature flags, apply enabled modules' migrations, and
// optionally bootstrap an initial "owner" user + membership.
// Usage:
//   node create-tenant.js --slug=acme --features=notes
//   node create-tenant.js --slug=acme --features=notes --owner-email=owner@acme.test [--owner-password=...]
'use strict';

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '../..');
// Resolved relative to this file, not process.cwd() — this script may be
// invoked from the repo root (pnpm scripts) or from apps/api (pnpm --filter).
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { parseArgs } = require('../generators/_lib/parse-args');
const { toSafeSchemaName, applyPendingMigrations } = require('./lib/migration-runner');

const TENANT_MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle/tenant');
const MODULES_DIR = path.join(REPO_ROOT, 'apps/api/src/modules');
const DEFAULT_ROLES = [
  ['owner', 'Owner', 'Full tenant administration access', ['*']],
  ['admin', 'Admin', 'Manage tenant settings, users, and module data', [
    'tenant:settings:read',
    'tenant:settings:update',
    'tenant:members:read',
    'tenant:members:create',
    'tenant:members:update',
    'tenant:members:delete',
    'tenant:roles:read',
    'tenant:roles:create',
    'tenant:roles:update',
    'tenant:roles:delete',
    'modules:*',
  ]],
  ['member', 'Member', 'Create and manage module data', [
    'tenant:settings:read',
    'modules:read',
    'modules:create',
    'modules:update',
    'modules:delete',
  ]],
  ['viewer', 'Viewer', 'Read-only access to tenant module data', [
    'tenant:settings:read',
    'modules:read',
  ]],
];

function generateTempPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || args.slug === true) {
    console.error('Usage: node create-tenant.js --slug=<slug> [--features=all|a,b] [--owner-email=] [--owner-password=]');
    process.exit(1);
  }

  const slug = String(args.slug).toLowerCase();
  const schemaName = toSafeSchemaName(slug);
  let features = [];
  if (typeof args.features === 'string') {
    if (args.features === 'all') {
      features = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } else {
      features = args.features.split(',').map((f) => f.trim()).filter(Boolean);
    }
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: existing } = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (existing.length > 0) {
      console.error(`Tenant "${slug}" already exists.`);
      process.exit(1);
    }

    console.log(`Provisioning tenant "${slug}" (schema "${schemaName}")...`);
    await client.query('CREATE SCHEMA IF NOT EXISTS "' + schemaName + '"');

    const { rows: tenantRows } = await client.query(
      'INSERT INTO tenants (slug, schema_name, status) VALUES ($1, $2, $3) RETURNING id',
      [slug, schemaName, 'active'],
    );
    const tenantId = tenantRows[0].id;

    for (const [key, name, description, permissions] of DEFAULT_ROLES) {
      await client.query(
        `INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system)
         VALUES ($1, $2, $3, $4, $5::jsonb, true)
         ON CONFLICT (tenant_id, key) DO NOTHING`,
        [tenantId, key, name, description, JSON.stringify(permissions)],
      );
    }

    console.log('Applying tenant-schema migrations...');
    await applyPendingMigrations(client, schemaName, TENANT_MIGRATIONS_DIR);
    for (const featureKey of features) {
      const moduleMigrationsDir = path.join(MODULES_DIR, featureKey, 'migrations');
      await applyPendingMigrations(client, schemaName, moduleMigrationsDir);
    }

    for (const featureKey of features) {
      await client.query(
        'INSERT INTO feature_flags (tenant_id, feature_key, enabled, enabled_at) VALUES ($1, $2, true, now())',
        [tenantId, featureKey],
      );
      console.log(`  enabled feature "${featureKey}"`);
    }

    if (typeof args['owner-email'] === 'string') {
      const email = args['owner-email'].toLowerCase();
      const rawPassword = typeof args['owner-password'] === 'string' ? args['owner-password'] : generateTempPassword();
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      const { rows: existingUsers } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      let userId;
      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
      } else {
        const { rows: userRows } = await client.query(
          'INSERT INTO users (email, password_hash, is_active) VALUES ($1, $2, true) RETURNING id',
          [email, passwordHash],
        );
        userId = userRows[0].id;
      }

      await client.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role, role_key, status)
         VALUES ($1, $2, 'owner', 'owner', 'active')
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner', role_key = 'owner', status = 'active'`,
        [tenantId, userId],
      );

      console.log(`  bootstrapped owner "${email}"`);
      if (typeof args['owner-password'] !== 'string') {
        console.log(`  temporary password: ${rawPassword}`);
      }
    }

    console.log(`Done. Tenant id: ${tenantId}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
