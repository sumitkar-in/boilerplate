#!/usr/bin/env node
'use strict';

/**
 * create-boilerplate — scaffold a new project from this template.
 *
 * Two modes:
 *   1. GitHub clone  — when run via `npx github:sumitkar-in/boilerplate my-app`
 *      or `npx create-boilerplate my-app` (after npm publish).
 *      Clones the repo from GitHub then renames in-place.
 *
 *   2. Local copy    — when run from inside the repo via `pnpm create:local`.
 *      Copies the source tree to the target directory then renames.
 *
 * Usage:
 *   npx github:sumitkar-in/boilerplate my-app
 *   npx github:sumitkar-in/boilerplate my-app --display-name="My App"
 *   npx github:sumitkar-in/boilerplate my-app --branch=main
 *   npx github:sumitkar-in/boilerplate .        # scaffold into current dir
 */

const fs   = require('node:fs');
const path = require('node:path');
const { spawnSync, execSync } = require('node:child_process');

// ─── constants ────────────────────────────────────────────────────────────────

const GITHUB_REPO   = 'https://github.com/sumitkar-in/boilerplate.git';
const DEFAULT_BRANCH = 'main';

const IGNORED_DIRS = new Set([
  '.agents', '.claude', '.codex', '.cursor', '.dev-logs',
  '.git', '.turbo', 'coverage', 'dist', 'node_modules',
]);
const IGNORED_FILES = new Set(['.env', '.env.local', 'summary.html']);

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
};

const step  = (n, msg) => console.log(`\n${c.bold}${c.cyan}[${n}]${c.reset} ${msg}`);
const ok    = (msg)    => console.log(`${c.green}  ✔ ${msg}${c.reset}`);
const info  = (msg)    => console.log(`${c.dim}    ${msg}${c.reset}`);
const warn  = (msg)    => console.log(`${c.yellow}  ⚠ ${msg}${c.reset}`);
const fatal = (msg)    => { console.error(`${c.red}  ✖ ${msg}${c.reset}`); process.exit(1); };

// ─── arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) { args.name ??= raw; continue; }
    const m = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (!m) continue;
    args[m[1]] = m[2] ?? true;
  }
  return args;
}

function usage() {
  console.log(`
${c.bold}create-boilerplate${c.reset} — scaffold a new project

${c.bold}Usage:${c.reset}
  npx github:sumitkar-in/boilerplate ${c.cyan}<project-name>${c.reset} [options]
  npx github:sumitkar-in/boilerplate ${c.cyan}.${c.reset}              ${c.dim}# scaffold into current dir${c.reset}

${c.bold}Options:${c.reset}
  --display-name="My App"   Human-readable product name  ${c.dim}(default: titleized project-name)${c.reset}
  --branch=main             Git branch to clone          ${c.dim}(default: main)${c.reset}
  --skip-git                Do not initialise a git repo in the new project
  --help, -h                Show this help

${c.bold}Examples:${c.reset}
  npx github:sumitkar-in/boilerplate acme-ops
  npx github:sumitkar-in/boilerplate acme-ops --display-name="Acme Operations"
  npx github:sumitkar-in/boilerplate acme-ops --branch=develop
  npx github:sumitkar-in/boilerplate .
`);
}

// ─── validation ───────────────────────────────────────────────────────────────

function validatePackageName(name) {
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) {
    fatal(`Invalid package name "${name}".\nUse lowercase letters, numbers, dots, dashes, and underscores.`);
  }
}

function validateTarget(targetDir) {
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    fatal(`Target directory is not empty: ${targetDir}\nChoose a different name or an empty directory.`);
  }
}

function hasGit() {
  try { execSync('git --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

// ─── source acquisition ───────────────────────────────────────────────────────

/**
 * Detect whether we are running from inside the repo (pnpm create:local)
 * or as a downloaded script (npx github:…).
 */
function isLocalMode() {
  // When run from inside the repo, __dirname is <repo>/scripts/
  const marker = path.join(__dirname, '..', 'pnpm-workspace.yaml');
  return fs.existsSync(marker);
}

function cloneFromGitHub(targetDir, branch) {
  step(1, `Cloning template from GitHub…`);
  info(`${GITHUB_REPO} (${branch})`);

  if (!hasGit()) fatal('git is not installed. Please install git and try again.');

  const result = spawnSync(
    'git',
    ['clone', '--depth=1', `--branch=${branch}`, GITHUB_REPO, targetDir],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? '';
    fatal(`git clone failed:\n${stderr}`);
  }
  ok('Repository cloned');
}

function copyFromLocal(targetDir) {
  step(1, 'Copying local template…');
  const sourceRoot = path.resolve(__dirname, '..');

  fs.cpSync(sourceRoot, targetDir, {
    recursive: true,
    filter(src) {
      const name = path.basename(src);
      return !IGNORED_DIRS.has(name) && !IGNORED_FILES.has(name);
    },
  });
  ok('Template copied');
}

// ─── post-setup ───────────────────────────────────────────────────────────────

function removeGitHistory(targetDir) {
  const gitDir = path.join(targetDir, '.git');
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }
}

function initGitRepo(targetDir) {
  if (!hasGit()) return;
  spawnSync('git', ['init', '--initial-branch=main'], { cwd: targetDir, stdio: 'ignore' });
  spawnSync('git', ['add', '-A'],                     { cwd: targetDir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'chore: scaffold from boilerplate'], {
    cwd: targetDir, stdio: 'ignore',
  });
  ok('Git repository initialised (initial commit created)');
}

function runRename(targetDir, name, displayName) {
  step(2, `Renaming project to ${c.bold}${name}${c.reset}…`);
  if (displayName) info(`Display name: ${displayName}`);

  const renameArgs = ['scripts/rename-project.js', name];
  if (displayName) renameArgs.push(`--display-name=${displayName}`);

  const result = spawnSync(process.execPath, renameArgs, {
    cwd: targetDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? '';
    fatal(`Rename failed:\n${stderr}`);
  }
  ok(`Renamed to ${name}`);
}

function printNextSteps(targetDir) {
  const rel = path.relative(process.cwd(), targetDir);
  const dir = rel && !rel.startsWith('..') ? rel : targetDir;

  console.log(`
${c.bold}${c.green}✔ Project ready!${c.reset}

${c.bold}Next steps:${c.reset}

  ${c.cyan}cd ${dir}${c.reset}
  ${c.cyan}pnpm install${c.reset}         ${c.dim}# install dependencies${c.reset}
  ${c.cyan}cp .env.example .env${c.reset} ${c.dim}# configure environment variables${c.reset}
  ${c.cyan}pnpm docker:up${c.reset}       ${c.dim}# start Postgres, Redis, and services${c.reset}
  ${c.cyan}pnpm db:fresh${c.reset}        ${c.dim}# run migrations and seed the database${c.reset}
  ${c.cyan}pnpm dev:api${c.reset}         ${c.dim}# start the NestJS API${c.reset}
  ${c.cyan}pnpm dev:web${c.reset}         ${c.dim}# start the React web app${c.reset}

${c.dim}Super-admin login:  https://localhost/super-admin/login${c.reset}
${c.dim}Default tenant:     https://localhost  (slug: demo)${c.reset}

${c.bold}Docs:${c.reset} ${c.blue}https://github.com/sumitkar-in/boilerplate/tree/main/docs${c.reset}
`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) { usage(); return; }

  const rawName = String(args.name ?? '').trim();
  if (!rawName) { usage(); process.exitCode = 1; return; }

  // Resolve the leaf package name (strip leading path segments like "../")
  const packageName = path.basename(rawName.replace(/\/$/, ''));
  validatePackageName(packageName);

  const targetDir = rawName === '.'
    ? process.cwd()
    : path.resolve(process.cwd(), rawName);

  if (rawName !== '.') validateTarget(targetDir);

  const displayName = String(args['display-name'] ?? '').trim() || undefined;
  const branch      = String(args.branch ?? DEFAULT_BRANCH).trim();
  const skipGit     = !!args['skip-git'];
  const local       = isLocalMode();

  console.log(`\n${c.bold}${c.cyan}◆ create-boilerplate${c.reset}  ${c.dim}v${require('../package.json').version}${c.reset}`);
  console.log(`  Creating ${c.bold}${packageName}${c.reset} in ${c.dim}${targetDir}${c.reset}`);

  // ── 1. Acquire source ──
  if (local) {
    copyFromLocal(targetDir);
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
    cloneFromGitHub(targetDir, branch);
    removeGitHistory(targetDir); // fresh history for the new project
  }

  // ── 2. Rename ──
  runRename(targetDir, packageName, displayName);

  // ── 3. Git ──
  if (!skipGit && !local) {
    step(3, 'Initialising git repository…');
    initGitRepo(targetDir);
  }

  // ── 4. Done ──
  printNextSteps(targetDir);
}

try {
  main();
} catch (err) {
  fatal(err instanceof Error ? err.message : String(err));
}
