#!/usr/bin/env node

/**
 * init-repo-structure.js
 *
 * STEP 2 of the repo bootstrap: layers the custom multi-tenant module
 * architecture (core/, modules/, packages/ui-common, skills/,
 * scripts/generators, drizzle/, infra/docker) and root workspace files on
 * top of a repo. It never touches anything a standard CLI generates.
 *
 * Run this AFTER init-repo.sh, which scaffolds apps/api, apps/web, and
 * apps/mobile via their real CLIs (nest new / create-vite / create-expo-app).
 * init-repo.sh calls this script automatically once scaffolding finishes —
 * you only need to run it by hand if you want to re-layer/update the custom
 * structure later (e.g. after pulling skill or template updates) without
 * re-scaffolding the apps.
 *
 * This script does NOT create apps/api, apps/web, or apps/mobile, and does
 * NOT write their package.json / entrypoint files — those must come from
 * the real CLIs (see init-repo.sh) so the apps stay upgradeable with their
 * own tooling (Nest CLI schematics, Vite, Expo CLI, EAS, etc).
 *
 * Usage:
 *   node init-repo-structure.js [target-dir]
 *
 * Examples:
 *   node init-repo-structure.js                # layers onto ./boilerplate
 *   node init-repo-structure.js my-app          # layers onto ./my-app
 *   node init-repo-structure.js .               # layers onto the current directory
 *
 * No dependencies — uses only Node's built-in fs/path modules.
 * Safe to re-run: existing files/folders are never overwritten.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'boilerplate';
const ROOT = path.resolve(process.cwd(), target);

// ---------------------------------------------------------------------------
// Logging helpers (mirrors the visual style of init-repo.sh)
// ---------------------------------------------------------------------------

const log = (msg) => console.log(`\n\x1b[1;36m▶ ${msg}\x1b[0m`);
const ok = (msg) => console.log(`  \x1b[1;32m✔ ${msg}\x1b[0m`);
const note = (msg) => console.log(`  \x1b[2m${msg}\x1b[0m`);

let dirsCreated = 0;
let filesCreated = 0;
let filesSkipped = 0;

function mkdir(relPath) {
  const full = path.join(ROOT, relPath);
  if (fs.mkdirSync(full, { recursive: true })) {
    dirsCreated++;
  }
}

function writeFile(relPath, content) {
  const full = path.join(ROOT, relPath);
  mkdir(path.dirname(relPath));
  let handle;
  try {
    handle = fs.openSync(full, 'wx');
  } catch (err) {
    if (!err || err.code !== 'EEXIST') throw err;
    note(`skip   ${relPath} (already exists)`);
    filesSkipped++;
    return;
  }
  try {
    fs.writeFileSync(handle, content.endsWith('\n') ? content : content + '\n', 'utf8');
  } finally {
    fs.closeSync(handle);
  }
  note(`create ${relPath}`);
  filesCreated++;
}

function writeFiles(relPaths) {
  for (const relPath of relPaths) writeFile(relPath, FILES[relPath]);
}

function keep(relPath) {
  // .gitkeep for otherwise-empty directories
  writeFile(relPath, '');
}

// ---------------------------------------------------------------------------
// Directory tree (custom layer only — apps/api, apps/web, apps/mobile
// themselves must already exist, scaffolded by init-repo.sh)
// ---------------------------------------------------------------------------

const DIRS = [
  // --- apps/api core/modules layer ---
  'apps/api/src/core/auth',
  'apps/api/src/core/tenants',
  'apps/api/src/core/feature-flags',
  'apps/api/src/core/users',
  'apps/api/src/core/scheduling',
  'apps/api/src/core/common/decorators',
  'apps/api/src/core/common/guards',
  'apps/api/src/core/common/filters',
  'apps/api/src/core/common/pipes',
  'apps/api/src/modules', // feature modules get added here by the generator
  'scripts/database',

  // --- apps/web core/modules layer ---
  'apps/web/src/core',
  'apps/web/src/modules', // frontend feature modules get added here by the generator

  // --- apps/mobile core/modules layer ---
  'apps/mobile/src/core',
  'apps/mobile/src/modules', // frontend feature modules get added here by the generator

  // --- packages/ui-common ---
  'packages/ui-common/src/components',
  'packages/ui-common/src/hooks',
  'packages/ui-common/src/theme',

  // --- infra ---
  'infra/docker',

  // --- drizzle ---
  'drizzle/core',
  'drizzle/tenant',

  // --- scripts/generators ---
  'scripts/generators/_templates/module',
  'scripts/generators/_templates/frontend-module',

  // --- skills ---
  'skills/nestjs-module',
  'skills/tenant-data-access',
  'skills/cron-jobs',
  'skills/feature-flags',
  'skills/frontend-module',
  'skills/migrations',
];

// ---------------------------------------------------------------------------
// File contents, grouped the same way they're logged below
// ---------------------------------------------------------------------------

const FILES = {
  // --- root workspace files ---
  'package.json': JSON.stringify(
    {
      name: 'boilerplate',
      private: true,
      version: '0.0.1',
      workspaces: ['apps/*', 'packages/*'],
      scripts: {
        'dev:api': 'pnpm --filter api start:dev',
        'dev:web': 'pnpm --filter web dev',
        'dev:mobile': 'pnpm --filter mobile start',
        'db:clean': 'node scripts/database/clean-database.js',
        'db:fresh': 'npm run db:clean && npm run migrate:core && npm run migrate:tenants && npm run seed:super-admin',
        'migrate:core': 'node scripts/database/migrate-core.js',
        'migrate:tenants': 'node scripts/database/migrate-tenants.js',
        'migrate:module': 'node scripts/database/migrate-module.js',
        'tenant:create': 'node scripts/database/create-tenant.js',
        'generate:module': 'node scripts/generators/generate-module.js',
        'generate:entity': 'node scripts/generators/generate-entity.js',
        'generate:cron-job': 'node scripts/generators/generate-cron-job.js',
        'generate:frontend-module': 'node scripts/generators/generate-frontend-module.js',
      },
    },
    null,
    2,
  ),

  'pnpm-workspace.yaml': `packages:
  - "apps/*"
  - "packages/*"
`,

  'tsconfig.base.json': JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: false,
        sourceMap: true,
        baseUrl: '.',
        paths: {
          '@boilerplate/ui-common': ['packages/ui-common/src/index.ts'],
        },
      },
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  ),

  '.env.example': `NODE_ENV=development

# Core database (also used as the connection root; tenant schemas live in the same DB)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app_db
REDIS_URL=redis://localhost:6379

JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too

WEB_URL=http://localhost:5173
API_URL=http://localhost:3000
`,

  '.gitignore': `node_modules/
dist/
build/
.expo/
.env
*.log
.DS_Store
coverage/
`,

  // README is patched in main() once the project name is known.
  'README.md': `# Multi-Tenant Modular Boilerplate\n`,

  // --- infra/docker ---
  'infra/docker/docker-compose.yml': `services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
`,

  // --- apps/api custom layer (core/, database/) ---
  'apps/api/src/core/tenants/tenant-context.ts': `// TenantContext type + AsyncLocalStorage holder.
// See: skills/tenant-data-access/SKILL.md
//
// export type TenantContext = {
//   tenantId: string;
//   tenantSlug: string;
//   schemaName: string;
//   userId: string;
//   role: 'owner' | 'admin' | 'member' | 'viewer';
//   enabledFeatures: Set<string>;
// };
`,

  'apps/api/src/core/scheduling/tenant-sweep.service.ts': `// Iterates active tenants — used by any module's cron fan-out.
// See: skills/cron-jobs/SKILL.md
`,

  'scripts/database/migrate-core.js': `#!/usr/bin/env node
// Applies drizzle/core migrations to the public/core schema.
// TODO: wire up drizzle-kit / migration runner.
console.log('TODO: migrate:core not yet implemented');
`,

  'scripts/database/migrate-tenants.js': `#!/usr/bin/env node
// Applies drizzle/tenant migrations + each enabled module's migrations
// to every existing tenant schema.
// TODO: wire up drizzle-kit / migration runner.
console.log('TODO: migrate:tenants not yet implemented');
`,

  'scripts/database/migrate-module.js': `#!/usr/bin/env node
// Applies one module's migrations across all tenants that have it enabled.
// Usage: node migrate-module.js <feature-key>
// TODO: wire up drizzle-kit / migration runner.
console.log('TODO: migrate:module not yet implemented');
`,

  'scripts/database/create-tenant.js': `#!/usr/bin/env node
// Provisions a new tenant: CREATE SCHEMA, insert core.tenants row,
// set enabled feature flags, apply enabled modules' migrations.
// Usage: node create-tenant.js --slug=acme --features=notes,employees
// TODO: implement.
console.log('TODO: tenant:create not yet implemented');
`,

  // --- apps/web custom layer (core/) ---
  'apps/web/src/core/module-loader.ts': `// Reads each frontend module's module.config.ts, lazy-loads its routes.tsx,
// and mounts it into the shell layout — gated by tenant feature flags.
// See: skills/frontend-module/SKILL.md
//
// const featureModules = [
//   // { key: 'notes', load: () => import('../modules/notes/routes') },
// ];
//
// export function getEnabledModules(enabledFeatureKeys: Set<string>) {
//   return featureModules.filter((m) => enabledFeatureKeys.has(m.key));
// }
`,

  // --- apps/mobile custom layer (core/) ---
  'apps/mobile/src/core/module-loader.ts': `// Mobile equivalent of apps/web/src/core/module-loader.ts — lazy-loads a
// feature module's screens/navigation, gated by tenant feature flags.
// See: skills/frontend-module/SKILL.md
//
// const featureModules = [
//   // { key: 'notes', load: () => import('../modules/notes/navigation') },
// ];
//
// export function getEnabledModules(enabledFeatureKeys: Set<string>) {
//   return featureModules.filter((m) => enabledFeatureKeys.has(m.key));
// }
`,

  // --- packages/ui-common ---
  'packages/ui-common/package.json': JSON.stringify(
    {
      name: '@boilerplate/ui-common',
      private: true,
      version: '0.0.1',
      main: 'src/index.ts',
    },
    null,
    2,
  ),

  'packages/ui-common/src/index.ts': `// Shared component library used by every frontend module (web + mobile).
// Promote a component here only once a second module needs it.
export {};
`,

  'packages/ui-common/src/hooks/useFeatureFlag.ts': `// export function useFeatureFlag(key: string) {
//   const { enabledFeatureKeys } = useTenant();
//   return enabledFeatureKeys.has(key);
// }
`,

  // --- scripts/generators ---
  'scripts/generators/generate-module.js': `#!/usr/bin/env node
// Scaffolds a brand-new backend feature module, fully wired:
// module/controller/service/entities/feature.json/migrations.
// Usage: node scripts/generators/generate-module.js --name=billing
// TODO: implement using scripts/generators/_templates/module/*
console.log('TODO: generate-module not yet implemented');
`,

  'scripts/generators/generate-entity.js': `#!/usr/bin/env node
// Adds a new Drizzle entity + matching migration inside an existing module.
// Usage: node scripts/generators/generate-entity.js --module=billing --name=invoice
console.log('TODO: generate-entity not yet implemented');
`,

  'scripts/generators/generate-cron-job.js': `#!/usr/bin/env node
// Adds a cron job (in-process or queue-backed repeatable job) inside an existing module.
// Usage: node scripts/generators/generate-cron-job.js --module=billing --name=invoice-sync --type=repeatable
console.log('TODO: generate-cron-job not yet implemented');
`,

  'scripts/generators/generate-frontend-module.js': `#!/usr/bin/env node
// Scaffolds routes.tsx/screens, module.config.ts, and folder structure for a
// new frontend module on web, mobile, or both, and registers it in the
// matching module-loader.ts.
// Usage: node scripts/generators/generate-frontend-module.js --name=billing --platform=web|mobile|both
console.log('TODO: generate-frontend-module not yet implemented');
`,

  // --- skills ---
  'skills/nestjs-module/SKILL.md': `# Skill: NestJS Feature Module Shape

What: every backend feature lives in \`apps/api/src/modules/<feature>/\` with the
same shape — module/controller/service/dto/entities/jobs/cron/migrations/feature.json.

When to use: any new domain/feature added to the boilerplate.

Rules:
- A module only touches its own tables.
- A module declares its own migrations (picked up automatically — see migrations skill).
- A module is toggleable via feature.json + FeatureFlagGuard.
- A module can be deleted without breaking others.
`,

  'skills/tenant-data-access/SKILL.md': `# Skill: Tenant-Scoped Data Access

What: every tenant-table query must take a TenantContext — never query a
tenant table without it.

Good:  contactsService.findAll(tenantContext, filters)
Avoid: contactsRepository.find()

TenantContext is resolved once per request (subdomain → x-tenant-id header →
JWT claim) and stored in AsyncLocalStorage.
`,

  'skills/cron-jobs/SKILL.md': `# Skill: Cron Jobs / Scheduled Tasks

What: two mechanisms —
- @Cron() (in-process, @nestjs/schedule) for lightweight global sweeps.
- BullMQ repeatable jobs (queued per tenant, stable jobId) for tenant-specific
  or external-API-facing scheduled work.

When to use which: prefer repeatable jobs for anything tenant-specific or
that calls an external API — retries/backoff come for free.

Rules:
- Gate cron work behind the same FeatureFlagGuard logic as routes.
- Global sweeps live in core/scheduling/; tenant-specific logic lives in the
  owning module's cron/ folder.
`,

  'skills/feature-flags/SKILL.md': `# Skill: Feature Flags (Tenant-Specific Toggles)

What: every module ships a feature.json key. FeatureFlagGuard checks
tenantContext.enabledFeatures before any of the module's routes/jobs/cron
run for a given tenant.

Usage:
  @RequireFeature('billing')
  @Controller('billing')
  export class BillingController {}

Frontend equivalent: useFeatureFlag(key) gates whether a module's bundle is
even lazy-loaded by the shell (web or mobile).
`,

  'skills/frontend-module/SKILL.md': `# Skill: Frontend Module Shape (Micro-Frontend)

What: every frontend feature lives in \`apps/web/src/modules/<feature>/\` (and,
if it ships on mobile, \`apps/mobile/src/modules/<feature>/\`) with the same
module.config.ts shape — routes.tsx/pages/ on web, screens/navigation.ts on
mobile, plus components/, api/, store/ on each.

The shell (apps/<platform>/src/core/module-loader.ts) lazy-loads a module's
routes/navigation via dynamic import(), gated by the tenant's enabled
feature keys.

Rules:
- A component goes in packages/ui-common only once a second module needs it,
  and only on web — React Native can't render DOM components, so ui-common's
  components/ folder is web-only. hooks/ and theme/ are shared by both.
- ui-common has no feature-specific logic.
- No module imports another module's components/ or store/ directly.
`,

  'skills/migrations/SKILL.md': `# Skill: Module-Owned Migrations

What: drizzle/core/ holds core schema migrations (applied once). Each
feature module owns its own migrations/ folder, applied to every tenant
schema that has that module enabled.

Commands:
  pnpm migrate:core
  pnpm migrate:tenants
  pnpm migrate:module <feature-key>
  pnpm tenant:create --slug=acme --features=notes,employees

Each tenant schema tracks its own applied-migrations log
(tenant_<slug>.__migrations), so adding a new module never touches another
module's migration history.
`,
};

// Logical sections, in the order they're applied — used purely for log output.
const SECTIONS = [
  ['apps/api custom layer (core/, database/)', [
    'apps/api/src/core/tenants/tenant-context.ts',
    'apps/api/src/core/scheduling/tenant-sweep.service.ts',
    'scripts/database/migrate-core.js',
    'scripts/database/migrate-tenants.js',
    'scripts/database/migrate-module.js',
    'scripts/database/create-tenant.js',
  ]],
  ['apps/web custom layer (core/)', [
    'apps/web/src/core/module-loader.ts',
  ]],
  ['apps/mobile custom layer (core/)', [
    'apps/mobile/src/core/module-loader.ts',
  ]],
  ['packages/ui-common (shared by web + mobile)', [
    'packages/ui-common/package.json',
    'packages/ui-common/src/index.ts',
    'packages/ui-common/src/hooks/useFeatureFlag.ts',
  ]],
  ['infra/docker', [
    'infra/docker/docker-compose.yml',
  ]],
  ['scripts/generators', [
    'scripts/generators/generate-module.js',
    'scripts/generators/generate-entity.js',
    'scripts/generators/generate-cron-job.js',
    'scripts/generators/generate-frontend-module.js',
  ]],
  ['skills/ (written references for the generators to follow)', [
    'skills/nestjs-module/SKILL.md',
    'skills/tenant-data-access/SKILL.md',
    'skills/cron-jobs/SKILL.md',
    'skills/feature-flags/SKILL.md',
    'skills/frontend-module/SKILL.md',
    'skills/migrations/SKILL.md',
  ]],
  ['root workspace files', [
    'package.json',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    '.env.example',
    '.gitignore',
    'README.md',
  ]],
];

// ---------------------------------------------------------------------------
// .gitkeep placeholders for directories with no seed file yet
// ---------------------------------------------------------------------------

const KEEP_DIRS = [
  'apps/api/src/core/auth',
  'apps/api/src/core/users',
  'apps/api/src/core/common/decorators',
  'apps/api/src/core/common/guards',
  'apps/api/src/core/common/filters',
  'apps/api/src/core/common/pipes',
  'apps/api/src/modules',
  'apps/web/src/modules',
  'apps/mobile/src/modules',
  'packages/ui-common/src/components',
  'packages/ui-common/src/theme',
  'drizzle/core',
  'drizzle/tenant',
  'scripts/generators/_templates/module',
  'scripts/generators/_templates/frontend-module',
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function main() {
  log(`Layering custom architecture onto ${ROOT}`);
  if (!fs.existsSync(path.join(ROOT, 'apps', 'api'))) {
    note('apps/api not found — did you run init-repo.sh first? Continuing anyway.');
  }

  log('Creating directory tree');
  DIRS.forEach(mkdir);
  ok(`${DIRS.length} directories ensured`);

  for (const [label, files] of SECTIONS) {
    log(label);
    writeFiles(files);
  }

  log('Adding .gitkeep to otherwise-empty directories');
  KEEP_DIRS.forEach((dir) => keep(path.join(dir, '.gitkeep')));
  ok(`${KEEP_DIRS.length} .gitkeep files ensured`);

  // Patch the README with the actual target name now that it's known.
  log('Writing README.md');
  const readmePath = path.join(ROOT, 'README.md');
  const projectName = path.basename(ROOT);
  fs.writeFileSync(
    readmePath,
    `# ${projectName}

Modular, multi-tenant, extendable boilerplate — NestJS API, React (Vite) web
app, and React Native (Expo) mobile app — scaffolded with standard CLIs
(\`init-repo.sh\`) and layered with a shared core/modules pattern
(\`init-repo-structure.js\`) for tenant separation and per-tenant feature
toggles.

## Apps

- \`apps/api\`    — NestJS backend (scaffolded via \`@nestjs/cli\`)
- \`apps/web\`     — React + Vite frontend (scaffolded via \`create-vite\`)
- \`apps/mobile\`  — React Native + Expo app (scaffolded via \`create-expo-app\`)
- \`packages/ui-common\` — shared hooks/theme (web + mobile) and components (web only)

## Quick start

\`\`\`bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm install
pnpm migrate:core
pnpm tenant:create --slug=demo --features=
pnpm dev:api
pnpm dev:web
pnpm dev:mobile   # opens Expo Dev Tools — scan the QR with Expo Go, or run an emulator
\`\`\`

If testing on a physical device via Expo Go, \`localhost\` in \`API_URL\` won't
reach your dev machine — point the mobile app's API config at your machine's
LAN IP (or run \`expo start --tunnel\`) instead.

## Adding a new feature module

\`\`\`bash
pnpm generate:module --name=<feature>
pnpm generate:frontend-module --name=<feature> --platform=web|mobile|both
\`\`\`

See \`skills/\` for the conventions each generator follows.
`,
    'utf8',
  );
  ok('README.md written');

  log('Done');
  console.log(`  Project: ${ROOT}`);
  console.log(`  Directories created: ${dirsCreated}`);
  console.log(`  Files created:       ${filesCreated}`);
  console.log(`  Files skipped (already existed): ${filesSkipped}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${path.relative(process.cwd(), ROOT) || '.'}`);
  console.log('  docker compose -f infra/docker/docker-compose.yml up -d');
  console.log('  pnpm install');
  console.log('');
}

main();
