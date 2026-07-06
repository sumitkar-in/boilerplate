#!/usr/bin/env node
// Applies drizzle/core migrations to the public/core schema.
'use strict';

const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');
// Resolved relative to this file, not process.cwd() — this script may be
// invoked from the repo root (pnpm scripts) or from apps/api (pnpm --filter).
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });
const { Client } = require('pg');
const { applyPendingMigrations } = require('./lib/migration-runner');

const CORE_MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle/core');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log('Applying core migrations to schema "public"...');
    const pending = await applyPendingMigrations(client, 'public', CORE_MIGRATIONS_DIR);
    console.log(pending.length === 0 ? 'Already up to date.' : `Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
