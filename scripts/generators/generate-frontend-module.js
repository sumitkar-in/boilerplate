#!/usr/bin/env node
//
// generate-frontend-module.js
//
// Scaffolds a frontend micro-frontend module on web, mobile, or both,
// following the shape described in
// docs/multi-tenant-modular-boilerplate-architecture.md §11:
//
//   apps/web/src/modules/<feature>/
//   ├── module.config.ts   — { key, navLabel, icon }
//   ├── routes.tsx          — lazy-loaded route(s), default export
//   ├── pages/<Feature>Page.tsx
//   ├── api/                — this module's own API calls/hooks
//   ├── components/          — feature-specific components (empty to start)
//   └── store/               — local state for this module only (empty to start)
//
//   apps/mobile/src/modules/<feature>/
//   ├── module.config.ts   — same shape as web's
//   ├── navigation.tsx       — lazy-loaded stack, default export
//   ├── screens/<Feature>Screen.tsx
//   ├── api/, components/, store/  — same idea as web
//
// ...and registers the module in apps/web/src/core/module-loader.ts and/or
// apps/mobile/src/core/module-loader.ts so it's live immediately.
// See: skills/frontend-module/SKILL.md
//
// Usage:
//   node scripts/generators/generate-frontend-module.js --name=billing
//   node scripts/generators/generate-frontend-module.js --name=billing --platform=web
//   node scripts/generators/generate-frontend-module.js --name=billing --platform=mobile --label="Billing"
//
// --platform defaults to "both". Safe to re-run: refuses to overwrite a
// module that already exists for the selected platform(s).

const fs = require('fs');
const path = require('path');
const { toKebabCase, toPascalCase, toTitleCase } = require('./_lib/casing');
const { log, ok, note, warn, fail } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { renderTemplate } = require('./_lib/render-template');
const { repoRoot, keepDir, writeFile, readTemplate } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const TEMPLATES_DIR = path.join(__dirname, '_templates', 'frontend-module');
const VALID_PLATFORMS = ['web', 'mobile', 'both'];
const LOADER_MARKER = '// new modules are appended below this line — see scripts/generators/generate-frontend-module.js';

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-frontend-module.js --name=<feature> [--platform=web|mobile|both] [--label="<Display Label>"]

  --platform defaults to "both".

Examples:
  node scripts/generators/generate-frontend-module.js --name=billing
  node scripts/generators/generate-frontend-module.js --name=billing --platform=web
`);
  process.exit(1);
}

const PLATFORMS = {
  web: {
    appDir: 'apps/web',
    moduleDir: (key) => path.join(ROOT, 'apps/web/src/modules', key),
    loaderPath: path.join(ROOT, 'apps/web/src/core/module-loader.ts'),
    loaderEntry: (key) => `{ key: '${key}', load: () => import('../modules/${key}/routes') },`,
    templatesDir: path.join(TEMPLATES_DIR, 'web'),
    files: (vars) => [
      { template: 'module.config.ts.tpl', output: 'module.config.ts' },
      { template: 'routes.tsx.tpl', output: 'routes.tsx' },
      { template: 'pages/Page.tsx.tpl', output: `pages/${vars.FeatureName}Page.tsx` },
      { template: 'api.ts.tpl', output: 'api/index.ts' },
    ],
    emptyDirs: ['components', 'store'],
  },
  mobile: {
    appDir: 'apps/mobile',
    moduleDir: (key) => path.join(ROOT, 'apps/mobile/src/modules', key),
    loaderPath: path.join(ROOT, 'apps/mobile/src/core/module-loader.ts'),
    loaderEntry: (key) => `{ key: '${key}', load: () => import('../modules/${key}/navigation') },`,
    templatesDir: path.join(TEMPLATES_DIR, 'mobile'),
    files: (vars) => [
      { template: 'module.config.ts.tpl', output: 'module.config.ts' },
      { template: 'navigation.ts.tpl', output: 'navigation.tsx' }, // contains JSX — must be .tsx, not .ts
      { template: 'screens/Screen.tsx.tpl', output: `screens/${vars.FeatureName}Screen.tsx` },
      { template: 'api.ts.tpl', output: 'api/index.ts' },
    ],
    emptyDirs: ['components', 'store'],
  },
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || args.name === true) printUsageAndExit();

  const platformArg = args.platform === true || args.platform === undefined ? 'both' : args.platform;
  if (!VALID_PLATFORMS.includes(platformArg)) {
    fail(`--platform must be one of: ${VALID_PLATFORMS.join(', ')} (got "${platformArg}")`);
  }
  const platforms = platformArg === 'both' ? ['web', 'mobile'] : [platformArg];

  const featureKey = toKebabCase(args.name);
  const FeatureName = toPascalCase(args.name);
  const FeatureLabel = typeof args.label === 'string' ? args.label : toTitleCase(args.name);
  if (!featureKey) fail(`--name="${args.name}" did not produce a usable module key.`);

  const vars = { featureKey, FeatureName, FeatureLabel };

  log(`Generating frontend module "${featureKey}" for platform(s): ${platforms.join(', ')}`);

  // Validate all targets up front so a "both" run never half-applies.
  for (const platform of platforms) {
    const dir = PLATFORMS[platform].moduleDir(featureKey);
    if (fs.existsSync(dir)) {
      fail(
        `${PLATFORMS[platform].appDir}/src/modules/${featureKey}/ already exists — refusing to overwrite.\n` +
          `  Pick a different --name, or edit that module directly.`,
      );
    }
  }

  for (const platform of platforms) {
    const config = PLATFORMS[platform];
    const moduleDir = config.moduleDir(featureKey);

    log(`[${platform}] Writing files from scripts/generators/_templates/frontend-module/${platform}/`);
    for (const { template, output } of config.files(vars)) {
      const rendered = renderTemplate(readTemplate(config.templatesDir, template), vars);
      writeFile(path.join(moduleDir, output), rendered, { rootForLog: ROOT });
    }
    for (const dir of config.emptyDirs) {
      keepDir(path.join(moduleDir, dir), ROOT);
    }
    ok(`[${platform}] module folder shape complete`);

    log(`[${platform}] Registering in ${path.relative(ROOT, config.loaderPath)}`);
    registerInLoaderFile(config.loaderPath, path.relative(ROOT, config.loaderPath), config.loaderEntry(featureKey));
  }

  log('Done');
  for (const platform of platforms) {
    console.log(`  ${PLATFORMS[platform].appDir}/src/modules/${featureKey}/`);
  }
  console.log('');
  console.log('Next steps:');
  console.log(`  Build the matching backend module if it doesn't exist yet:`);
  console.log(`    node scripts/generators/generate-module.js --name=${featureKey}`);
  console.log(`  Then fill in the TODOs in pages/screens, api/, and wire up components/store as needed.`);
  console.log('');
}

function registerInLoaderFile(loaderPath, displayPath, entryLine) {
  if (!fs.existsSync(loaderPath)) {
    warn(`${displayPath} not found — skipping auto-registration. Add this entry by hand:\n    ${entryLine}`);
    return;
  }

  let content = fs.readFileSync(loaderPath, 'utf8');
  if (content.includes(entryLine)) {
    note(`${displayPath} already registers this module — skipping`);
    return;
  }

  const markerIndex = content.indexOf(LOADER_MARKER);
  if (markerIndex === -1) {
    warn(`Could not find the registration marker in ${displayPath} — add this entry to featureModules[] by hand:\n    ${entryLine}`);
    return;
  }

  const markerEnd = markerIndex + LOADER_MARKER.length;
  content = content.slice(0, markerEnd) + `\n  ${entryLine}` + content.slice(markerEnd);
  fs.writeFileSync(loaderPath, content, 'utf8');
  ok(`registered in ${displayPath}`);
}

main();
