import { readdirSync, readFileSync, existsSync, realpathSync } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
import type { PoolClient } from 'pg';

// Runtime (HTTP-triggered) counterpart to scripts/database/lib/
// migration-runner.js, used by the CLI scripts — same algorithm, ported to
// TS because it needs to run inside the Nest process (TenantProvisioningService),
// not a separate `node script.js` invocation. Keep the two in sync by hand;
// see skills/migrations/SKILL.md.

const SAFE_SCHEMA_NAME = /^[a-z0-9_]+$/;
const SAFE_MIGRATION_FILE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.sql$/;
const ALLOWED_MIGRATION_ROOTS = [
  resolve(process.cwd(), 'drizzle'),
  resolve(process.cwd(), 'apps/api/src/modules'),
  resolve(process.cwd(), 'apps/api/dist/modules'),
];

export function assertSafeSchemaName(schemaName: string): void {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new Error(`Unsafe schema name: "${schemaName}"`);
  }
}

// Derives a safe `tenant_<slug>` schema name from a raw slug — never trust
// raw input directly in a `CREATE SCHEMA` / `SET search_path` statement.
export function toSafeSchemaName(slug: string): string {
  const cleaned = slug
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

async function ensureSchema(
  client: PoolClient,
  schemaName: string,
): Promise<void> {
  assertSafeSchemaName(schemaName);
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
}

async function ensureMigrationsTable(
  client: PoolClient,
  schemaName: string,
): Promise<void> {
  assertSafeSchemaName(schemaName);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".__migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(
  client: PoolClient,
  schemaName: string,
): Promise<Set<string>> {
  assertSafeSchemaName(schemaName);
  const { rows } = await client.query<{ name: string }>(
    `SELECT name FROM "${schemaName}".__migrations`,
  );
  return new Set(rows.map((r) => r.name));
}

function listMigrationFiles(dir: string): string[] {
  const migrationDir = resolveMigrationDir(dir);
  if (!migrationDir) return [];
  return readdirSync(migrationDir)
    .filter((f) => SAFE_MIGRATION_FILE.test(f) && basename(f) === f)
    .sort();
}

function resolveMigrationDir(dir: string): string | null {
  const resolvedDir = resolve(dir);
  if (!isAllowedMigrationDir(resolvedDir) || !existsSync(resolvedDir)) {
    return null;
  }
  const realDir = realpathSync(resolvedDir);
  if (!isAllowedMigrationDir(realDir)) {
    throw new Error(`Migration directory is outside allowed roots: ${dir}`);
  }
  return realDir;
}

function isAllowedMigrationDir(dir: string): boolean {
  return ALLOWED_MIGRATION_ROOTS.some(
    (root) => dir === root || dir.startsWith(`${root}${sep}`),
  );
}

async function applyMigrationFile(
  client: PoolClient,
  schemaName: string,
  dir: string,
  filename: string,
  migrationName: string,
): Promise<void> {
  assertSafeSchemaName(schemaName);
  if (!SAFE_MIGRATION_FILE.test(filename) || basename(filename) !== filename) {
    throw new Error(`Unsafe migration filename: "${filename}"`);
  }
  const migrationDir = resolveMigrationDir(dir);
  if (!migrationDir) {
    throw new Error(`Migration directory not found or not allowed: ${dir}`);
  }
  const migrationPath = resolve(migrationDir, filename);
  if (!migrationPath.startsWith(`${migrationDir}${sep}`)) {
    throw new Error(`Migration path escapes its directory: ${filename}`);
  }
  const sql = readFileSync(migrationPath, 'utf8');
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
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Migration "${filename}" failed against schema "${schemaName}": ${message}`,
    );
  } finally {
    await client.query('SET search_path TO public');
  }
}

function migrationNameFor(dir: string, filename: string): string {
  const scope =
    basename(dir) === 'migrations' ? basename(dirname(dir)) : basename(dir);
  return `${scope}/${filename}`;
}

// Ensures the schema + its __migrations table exist, then applies every
// not-yet-applied *.sql file in `dir`, in filename order. Returns the list
// of newly applied filenames. If `dir` doesn't exist, this is a no-op —
// e.g. drizzle/tenant/ has no files yet, and it isn't shipped inside the
// dockerized API image (only apps/api/dist is), so this degrades to
// "nothing to apply" there rather than throwing.
export async function applyPendingMigrations(
  client: PoolClient,
  schemaName: string,
  dir: string,
): Promise<string[]> {
  await ensureSchema(client, schemaName);
  await ensureMigrationsTable(client, schemaName);
  const applied = await getAppliedMigrations(client, schemaName);
  const files = listMigrationFiles(dir);
  const pending = files.filter((f) => {
    const migrationName = migrationNameFor(dir, f);
    return !applied.has(migrationName) && !applied.has(f);
  });
  for (const file of pending) {
    await applyMigrationFile(
      client,
      schemaName,
      dir,
      file,
      migrationNameFor(dir, file),
    );
  }
  return pending.map((file) => migrationNameFor(dir, file));
}
