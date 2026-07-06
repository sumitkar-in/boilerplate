#!/usr/bin/env node
//
// generate-entity.js
//
// Adds a new Drizzle entity (apps/api/src/modules/<module>/entities/<name>.ts)
// plus a matching numbered migration (modules/<module>/migrations/NNNN_add_<name>.sql)
// inside an EXISTING module. See: skills/migrations/SKILL.md, skills/tenant-data-access/SKILL.md
//
// Usage:
//   node scripts/generators/generate-entity.js --module=billing --name=invoice
//
// Safe to re-run with a different --name: each call gets its own migration
// number. Refuses to overwrite an entity file that already exists.

const fs = require('fs');
const path = require('path');
const { toKebabCase, toPascalCase, toCamelCase, toSnakeCase } = require('./_lib/casing');
const { log, ok, note, fail } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { renderTemplate } = require('./_lib/render-template');
const { repoRoot, writeFile, readTemplate } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const TEMPLATES_DIR = path.join(__dirname, '_templates', 'entity');

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-entity.js --module=<feature> --name=<entity>

Example:
  node scripts/generators/generate-entity.js --module=billing --name=invoice
`);
  process.exit(1);
}

function nextMigrationNumber(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) return 1;
  const numbers = fs
    .readdirSync(migrationsDir)
    .map((f) => /^(\d{4})_/.exec(f))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.module || args.module === true || !args.name || args.name === true) printUsageAndExit();

  const moduleKey = toKebabCase(args.module);
  const moduleDir = path.join(ROOT, 'apps/api/src/modules', moduleKey);
  if (!fs.existsSync(moduleDir)) {
    fail(
      `apps/api/src/modules/${moduleKey}/ does not exist.\n` +
        `  Create it first: node scripts/generators/generate-module.js --name=${moduleKey}`,
    );
  }

  const entityKey = toKebabCase(args.name);
  const EntityName = toPascalCase(args.name);
  const entityName = toCamelCase(args.name);
  const entitySnake = toSnakeCase(args.name);
  const ModuleName = toPascalCase(args.module);

  log(`Adding entity "${entityKey}" to module "${moduleKey}"`);

  const entityPath = path.join(moduleDir, 'entities', `${entityKey}.ts`);
  if (fs.existsSync(entityPath)) {
    fail(`apps/api/src/modules/${moduleKey}/entities/${entityKey}.ts already exists — refusing to overwrite.`);
  }

  const migrationsDir = path.join(moduleDir, 'migrations');
  const migrationNumber = String(nextMigrationNumber(migrationsDir)).padStart(4, '0');
  const migrationFile = `${migrationNumber}_add_${entitySnake}.sql`;

  const vars = { moduleKey, ModuleName, entityKey, EntityName, entityName, entitySnake, migrationFile };

  log('Writing files from scripts/generators/_templates/entity/');
  writeFile(entityPath, renderTemplate(readTemplate(TEMPLATES_DIR, 'entity.ts.tpl'), vars), { rootForLog: ROOT });
  writeFile(
    path.join(migrationsDir, migrationFile),
    renderTemplate(readTemplate(TEMPLATES_DIR, 'entity-migration.sql.tpl'), vars),
    { rootForLog: ROOT },
  );
  ok('entity + migration written');

  log('Done');
  console.log(`  Entity:    apps/api/src/modules/${moduleKey}/entities/${entityKey}.ts  (export const ${entityName})`);
  console.log(`  Migration: apps/api/src/modules/${moduleKey}/migrations/${migrationFile}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Add columns to both files (they must stay in sync — see skills/migrations/SKILL.md)`);
  console.log(`  2. Use the entity from ${moduleKey}.service.ts only — other modules go through ${ModuleName}Service`);
  console.log(`  3. pnpm migrate:module ${moduleKey}   # applies pending migrations to tenants with this feature enabled`);
  console.log('');
}

main();
