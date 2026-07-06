#!/usr/bin/env node
// Cleans up the database by dropping public and all tenant_* schemas, then recreating public.
'use strict';

const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log('Cleaning up database...');
    
    // Drop all tenant schemas
    const { rows } = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
    );
    for (const row of rows) {
      console.log(`Dropping schema "${row.schema_name}"...`);
      await client.query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`);
    }

    // Drop and recreate public schema
    console.log('Recreating "public" schema...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    
    console.log('Database cleanup complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
