#!/usr/bin/env node
//
// generate-module.js
//
// Scaffolds a brand-new backend feature module, fully wired, following the
// shape described in docs/multi-tenant-modular-boilerplate-architecture.md §4:
//
//   apps/api/src/modules/<feature>/
//   ├── <feature>.module.ts        — registers controller + service, exports the service
//   ├── <feature>.controller.ts    — @RequireFeature() + FeatureFlagGuard already wired
//   ├── <feature>.service.ts       — TenantContext-first method signature
//   ├── dto/                       — empty, ready for request/response DTOs
//   ├── entities/                  — empty, filled by generate-entity.js
//   ├── jobs/                      — empty, BullMQ processors if the feature needs async work
//   ├── cron/                      — empty, filled by generate-cron-job.js
//   ├── migrations/0001_init.sql   — empty starter migration (tenant schema)
//   └── feature.json               — { key, label, defaultEnabled: false }
//
// ...and registers the module in apps/api/src/app.module.ts so it's live
// immediately. See: skills/nestjs-module/SKILL.md
//
// Usage:
//   node scripts/generators/generate-module.js --name=billing
//   node scripts/generators/generate-module.js --name="billing reports" --label="Billing Reports"
//
// Safe to re-run: refuses to overwrite a module that already exists.

const fs = require('fs');
const path = require('path');
const { toKebabCase, toPascalCase, toCamelCase, toTitleCase, toSnakeCase } = require('./_lib/casing');
const { log, ok, note, warn, fail } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { renderTemplate } = require('./_lib/render-template');
const { repoRoot, mkdir, writeFile, keepDir, readTemplate } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const TEMPLATES_DIR = path.join(__dirname, '_templates', 'module');

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-module.js --name=<feature> [--label="<Display Label>"]

Examples:
  node scripts/generators/generate-module.js --name=billing
  node scripts/generators/generate-module.js --name=crm --label="Customer Relationships"
`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || args.name === true) printUsageAndExit();

  const featureKey = toKebabCase(args.name);
  const FeatureName = toPascalCase(args.name);
  const featureName = toCamelCase(args.name);
  const FeatureLabel = typeof args.label === 'string' ? args.label : toTitleCase(args.name);
  const featureSnake = toSnakeCase(args.name);

  if (!featureKey) fail(`--name="${args.name}" did not produce a usable module key.`);

  log(`Generating backend module "${featureKey}" (apps/api/src/modules/${featureKey}/)`);

  const moduleDir = path.join(ROOT, 'apps/api/src/modules', featureKey);
  if (fs.existsSync(moduleDir)) {
    fail(
      `apps/api/src/modules/${featureKey}/ already exists — refusing to overwrite.\n` +
        `  Use generate-entity.js / generate-cron-job.js to add to it, or pick a different --name.`,
    );
  }

  const vars = { featureKey, FeatureName, featureName, FeatureLabel, featureSnake };

  const FILES = [
    { template: 'module.module.ts.tpl', output: `${featureKey}.module.ts` },
    { template: 'module.controller.ts.tpl', output: `${featureKey}.controller.ts` },
    { template: 'module.service.ts.tpl', output: `${featureKey}.service.ts` },
    { template: 'feature.json.tpl', output: 'feature.json' },
    { template: 'migrations/0001_init.sql.tpl', output: 'migrations/0001_init.sql' },
  ];

  log('Writing files from scripts/generators/_templates/module/');
  for (const { template, output } of FILES) {
    const rendered = renderTemplate(readTemplate(TEMPLATES_DIR, template), vars);
    writeFile(path.join(moduleDir, output), rendered, { rootForLog: ROOT });
  }

  log('Creating empty dto/, entities/, jobs/, cron/ folders');
  for (const dir of ['dto', 'entities', 'jobs', 'cron']) {
    keepDir(path.join(moduleDir, dir), ROOT);
  }
  ok('module folder shape complete');

  log('Registering the module in apps/api/src/app.module.ts');
  registerModuleInAppModule(featureKey, FeatureName);

  log('Done');
  console.log(`  Module:  apps/api/src/modules/${featureKey}/`);
  console.log(`  Route:   /${featureKey}  (gated by @RequireFeature('${featureKey}'), defaultEnabled: false)`);
  console.log('');
  console.log('Next steps:');
  console.log(`  node scripts/generators/generate-entity.js --module=${featureKey} --name=<entity>`);
  console.log(`  node scripts/generators/generate-cron-job.js --module=${featureKey} --name=<job> --type=cron|repeatable`);
  console.log(`  node scripts/generators/generate-frontend-module.js --name=${featureKey} --platform=web|mobile|both`);
  console.log(`  pnpm tenant:create --slug=<tenant> --features=${featureKey}   # or pnpm migrate:module ${featureKey} for an existing tenant`);
  console.log('');
}

function registerModuleInAppModule(featureKey, FeatureName) {
  const appModulePath = path.join(ROOT, 'apps/api/src/app.module.ts');
  if (!fs.existsSync(appModulePath)) {
    warn(`apps/api/src/app.module.ts not found — skipping auto-registration. Wire ${FeatureName}Module in by hand.`);
    return;
  }

  let content = fs.readFileSync(appModulePath, 'utf8');
  const importLine = `import { ${FeatureName}Module } from './modules/${featureKey}/${featureKey}.module';`;

  if (content.includes(importLine)) {
    note(`apps/api/src/app.module.ts already imports ${FeatureName}Module — skipping`);
    return;
  }

  const importRegex = /^import .+;$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content))) lastImportMatch = match;
  if (!lastImportMatch) {
    warn('Could not find an import statement in app.module.ts to anchor the new import after — skipping auto-registration.');
    return;
  }
  const importInsertAt = lastImportMatch.index + lastImportMatch[0].length;
  content = content.slice(0, importInsertAt) + `\n${importLine}` + content.slice(importInsertAt);

  const marker = '// feature modules are registered below this line, one per generated module — see scripts/generators/generate-module.js';
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    warn('Could not find the feature-module registration marker comment in app.module.ts — import added, but add the module to the `imports: []` array by hand.');
    fs.writeFileSync(appModulePath, content, 'utf8');
    return;
  }
  const markerEnd = markerIndex + marker.length;
  content = content.slice(0, markerEnd) + `\n    ${FeatureName}Module,` + content.slice(markerEnd);

  fs.writeFileSync(appModulePath, content, 'utf8');
  ok(`registered ${FeatureName}Module in apps/api/src/app.module.ts`);
}

main();
