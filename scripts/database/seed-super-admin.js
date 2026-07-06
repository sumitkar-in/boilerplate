#!/usr/bin/env node
// Creates (or upserts) a platform-wide super admin — a user with no tenant
// membership requirement, who logs into any tenant with owner-level access.
// See apps/api/src/core/auth/auth.service.ts (resolveRole) and
// apps/api/src/core/auth/auth-context.middleware.ts.
// Usage:
//   node seed-super-admin.js --email=admin@example.com [--password=...]
'use strict';

const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');
// Resolved relative to this file, not process.cwd() — this script may be
// invoked from the repo root (pnpm scripts) or from apps/api (pnpm --filter).
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { parseArgs } = require('../generators/_lib/parse-args');

function generateTempPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (typeof args.email === 'string' ? args.email : 'admin@example.com').toLowerCase();
  const rawPassword = typeof args.password === 'string' ? args.password : generateTempPassword();
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: existing } = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.length > 0) {
      await client.query(
        `UPDATE users
         SET password_hash = $1, is_active = true, is_super_admin = true, updated_at = now()
         WHERE id = $2`,
        [passwordHash, existing[0].id],
      );
      console.log(`Updated existing user "${email}" -> super admin.`);
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, is_active, is_super_admin)
         VALUES ($1, $2, true, true)`,
        [email, passwordHash],
      );
      console.log(`Created super admin "${email}".`);
    }

    if (typeof args.password !== 'string') {
      console.log(`Temporary password: ${rawPassword}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
