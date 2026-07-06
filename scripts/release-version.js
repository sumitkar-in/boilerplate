#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const versionFiles = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/mobile/package.json',
  'packages/ui-common/package.json',
];
const serviceWorkerFile = 'apps/web/public/sw.js';
const webManifestFile = 'apps/web/public/manifest.webmanifest';

function usage() {
  console.log(`Usage:
  pnpm release:version <version|major|minor|patch> [--dry-run]

Examples:
  pnpm release:version 1.4.0
  pnpm release:version patch --dry-run
  pnpm release:version minor`);
}

function absolute(relativePath) {
  return path.join(rootDir, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function writeJson(relativePath, value, dryRun, changes) {
  changes.push(relativePath);
  if (!dryRun) {
    fs.writeFileSync(absolute(relativePath), `${JSON.stringify(value, null, 2)}\n`);
  }
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  if (!match) {
    throw new Error(`Invalid version "${version}". Expected semantic version like 1.2.3.`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? '',
  };
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}${version.prerelease ? `-${version.prerelease}` : ''}`;
}

function bumpVersion(currentVersion, bump) {
  const current = parseVersion(currentVersion);
  if (current.prerelease) {
    throw new Error('major, minor, and patch bumps require a stable current version.');
  }

  if (bump === 'major') return `${current.major + 1}.0.0`;
  if (bump === 'minor') return `${current.major}.${current.minor + 1}.0`;
  if (bump === 'patch') return `${current.major}.${current.minor}.${current.patch + 1}`;

  throw new Error(`Unsupported bump "${bump}". Use major, minor, patch, or an explicit version.`);
}

function resolveTargetVersion(target) {
  if (['major', 'minor', 'patch'].includes(target)) {
    return bumpVersion(readJson('package.json').version, target);
  }

  return formatVersion(parseVersion(target));
}

function updatePackageVersions(version, dryRun, changes) {
  for (const relativePath of versionFiles) {
    if (!fs.existsSync(absolute(relativePath))) continue;

    const pkg = readJson(relativePath);
    if (pkg.version === version) continue;

    pkg.version = version;
    writeJson(relativePath, pkg, dryRun, changes);
  }
}

function updateWebManifest(version, dryRun, changes) {
  if (!fs.existsSync(absolute(webManifestFile))) return;

  const manifest = readJson(webManifestFile);
  if (manifest.version === version) return;

  manifest.version = version;
  writeJson(webManifestFile, manifest, dryRun, changes);
}

function updateServiceWorkerCache(version, dryRun, changes) {
  if (!fs.existsSync(absolute(serviceWorkerFile))) return;

  const filePath = absolute(serviceWorkerFile);
  const current = fs.readFileSync(filePath, 'utf8');
  const cacheName = `boilerplate-web-v${version}`;
  const next = current.replace(
    /const CACHE_NAME = ['"]boilerplate-web-v[^'"]+['"];/,
    `const CACHE_NAME = '${cacheName}';`,
  );

  if (next === current) {
    if (!current.includes(cacheName)) {
      throw new Error(`Could not find CACHE_NAME in ${serviceWorkerFile}.`);
    }
    return;
  }

  changes.push(serviceWorkerFile);
  if (!dryRun) fs.writeFileSync(filePath, next);
}

function parseArgs(argv) {
  const args = new Set(argv.filter((arg) => arg.startsWith('--')));
  const target = argv.find((arg) => !arg.startsWith('--'));

  return {
    dryRun: args.has('--dry-run'),
    help: args.has('--help') || args.has('-h'),
    target,
  };
}

function main() {
  const { dryRun, help, target } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }

  if (!target) {
    usage();
    process.exitCode = 1;
    return;
  }

  const version = resolveTargetVersion(target);
  const changes = [];

  updatePackageVersions(version, dryRun, changes);
  updateWebManifest(version, dryRun, changes);
  updateServiceWorkerCache(version, dryRun, changes);

  const prefix = dryRun ? 'Would update' : 'Updated';
  if (changes.length === 0) {
    console.log(`Version ${version} is already applied.`);
    return;
  }

  console.log(`${prefix} release version to ${version}:`);
  for (const change of changes) console.log(`- ${change}`);
  console.log('Run pnpm install --lockfile-only after version changes if the lockfile metadata must be refreshed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
