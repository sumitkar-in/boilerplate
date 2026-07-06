#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const oldSlug = 'boilerplate';
const oldDisplayName = 'Boilerplate';
const oldUiPackage = '@boilerplate/ui-common';

const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sh',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.yml',
  '.yaml',
]);
const ignoredDirectories = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);
const ignoredFiles = new Set(['pnpm-lock.yaml']);

function usage() {
  console.log(`Usage:
  pnpm rename:project --name=<new-name> [--display-name="New Name"]
  node scripts/rename-project.js <new-name> --display-name="New Name"

Examples:
  pnpm rename:project --name=acme-ops --display-name="Acme Ops"
  pnpm rename:project my-saas`);
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) {
      args.name ??= raw;
      continue;
    }
    const match = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (!match) continue;
    args[match[1]] = match[2] ?? true;
  }
  return args;
}

function validatePackageName(name) {
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) {
    throw new Error(`Invalid npm package name "${name}". Use lowercase letters, numbers, dots, dashes, and underscores.`);
  }
}

function titleize(name) {
  const unscoped = name.includes('/') ? name.split('/').pop() : name;
  return unscoped
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function packageScope(name) {
  if (name.startsWith('@')) return name.split('/')[0];
  return `@${name}`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function writeJson(relativePath, value, changes) {
  fs.writeFileSync(path.join(rootDir, relativePath), `${JSON.stringify(value, null, 2)}\n`);
  changes.add(relativePath);
}

function updateJsonIfExists(relativePath, updater, changes) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return;

  const value = readJson(relativePath);
  const next = updater(value) ?? value;
  writeJson(relativePath, next, changes);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (ignoredFiles.has(entry.name)) continue;
    if (!textExtensions.has(path.extname(entry.name))) continue;
    files.push(absolutePath);
  }
  return files;
}

function replaceInTextFiles(replacements, changes) {
  for (const absolutePath of walk(rootDir)) {
    const relativePath = path.relative(rootDir, absolutePath);
    let current = fs.readFileSync(absolutePath, 'utf8');
    let next = current;

    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }

    if (next !== current) {
      fs.writeFileSync(absolutePath, next);
      changes.add(relativePath);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    return;
  }

  const name = String(args.name ?? '').trim();
  if (!name) {
    usage();
    process.exitCode = 1;
    return;
  }

  validatePackageName(name);
  const displayName = String(args['display-name'] ?? titleize(name)).trim();
  const uiPackage = `${packageScope(name)}/ui-common`;
  const cachePrefix = `${name.replace(/^@/, '').replace('/', '-')}-web-v`;
  const changes = new Set();

  updateJsonIfExists('package.json', (pkg) => {
    pkg.name = name;
    pkg.license = 'AGPL-3.0-or-later';
    return pkg;
  }, changes);

  updateJsonIfExists('packages/ui-common/package.json', (pkg) => {
    pkg.name = uiPackage;
    pkg.license = 'AGPL-3.0-or-later';
    return pkg;
  }, changes);

  for (const packagePath of ['apps/api/package.json', 'apps/web/package.json', 'apps/mobile/package.json']) {
    updateJsonIfExists(packagePath, (pkg) => {
      pkg.license = 'AGPL-3.0-or-later';
      if (pkg.dependencies?.[oldUiPackage]) {
        pkg.dependencies[uiPackage] = pkg.dependencies[oldUiPackage];
        delete pkg.dependencies[oldUiPackage];
      }
      return pkg;
    }, changes);
  }

  const replacements = [
    [oldUiPackage, uiPackage],
    ['boilerplate-web-v', cachePrefix],
    ['# boilerplate', `# ${name}`],
    [`'boilerplate.`, `'${name}.`],
    [`"boilerplate.`, `"${name}.`],
    [oldDisplayName, displayName],
  ];
  replaceInTextFiles(replacements, changes);

  console.log(`Renamed project to ${displayName} (${name}).`);
  for (const change of Array.from(changes).sort()) console.log(`- ${change}`);
  console.log('Run pnpm install --lockfile-only after renaming to refresh workspace lockfile metadata.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
