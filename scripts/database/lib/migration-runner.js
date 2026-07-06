#!/usr/bin/env node
// Shared migration-runner primitives used by migrate-core.js,
// migrate-tenants.js, migrate-module.js, and create-tenant.js.
// See: skills/migrations/SKILL.md
'use strict';

const fs = require('fs');
const path = require('path');

const SAFE_SCHEMA_NAME = /^[a-z0-9_]+$/;

function assertSafeSchemaName(schemaName) {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new Error(`Unsafe schema name: "${schemaName}"`);
  }
}

// Derives a safe `tenant_<slug>` schema name from a raw slug — never trust
// raw input directly in a `CREATE SCHEMA` / `SET search_path` statement.
function toSafeSchemaName(slug) {
  const cleaned = String(slug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned) {
    throw new Error(`"${slug}" does not produce a usable schema name`);
  }
  const schemaName = `tenant_${cleaned}`;
  assertSafeSchemaName(schemaName);
  return schemaName;
}

async function ensureSchema(client, schemaName) {
  assertSafeSchemaName(schemaName);
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
}

async function ensureMigrationsTable(client, schemaName) {
  assertSafeSchemaName(schemaName);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".__migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client, schemaName) {
  assertSafeSchemaName(schemaName);
  const { rows } = await client.query(
    `SELECT name FROM "${schemaName}".__migrations`,
  );
  return new Set(rows.map((r) => r.name));
}

function listMigrationFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function applyMigrationFile(client, schemaName, dir, filename, migrationName) {
  assertSafeSchemaName(schemaName);
  const sql = fs.readFileSync(path.join(dir, filename), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(`SET search_path TO "${schemaName}", public`);
    await client.query(sql);
    await client.query(
      `INSERT INTO "${schemaName}".__migrations (name) VALUES ($1)`,
      [migrationName],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(
      `Migration "${filename}" failed against schema "${schemaName}": ${err.message}`,
    );
  } finally {
    await client.query('SET search_path TO public');
  }
}

function migrationNameFor(dir, filename) {
  const scope = path.basename(dir) === 'migrations'
    ? path.basename(path.dirname(dir))
    : path.basename(dir);
  return `${scope}/${filename}`;
}

// Ensures the schema + its __migrations table exist, then applies every
// not-yet-applied *.sql file in `dir`, in filename order. Returns the list
// of newly applied filenames.
async function applyPendingMigrations(client, schemaName, dir) {
  await ensureSchema(client, schemaName);
  await ensureMigrationsTable(client, schemaName);
  const applied = await getAppliedMigrations(client, schemaName);
  const files = listMigrationFiles(dir);
  const pending = files.filter((f) => {
    const migrationName = migrationNameFor(dir, f);
    return !applied.has(migrationName) && !applied.has(f);
  });
  for (const file of pending) {
    const migrationName = migrationNameFor(dir, file);
    await applyMigrationFile(client, schemaName, dir, file, migrationName);
    console.log(`  applied ${migrationName} -> ${schemaName}`);
  }
  return pending.map((file) => migrationNameFor(dir, file));
}

module.exports = {
  toSafeSchemaName,
  assertSafeSchemaName,
  ensureSchema,
  ensureMigrationsTable,
  getAppliedMigrations,
  listMigrationFiles,
  applyMigrationFile,
  applyPendingMigrations,
};
