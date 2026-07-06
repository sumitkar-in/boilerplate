#!/usr/bin/env node
//
// generate-cron-job.js
//
// Adds a cron job inside an EXISTING module's cron/ folder, per
// docs/multi-tenant-modular-boilerplate-architecture.md §9:
//
//   --type=cron        in-process @Cron() sweep (apps/api/src/core/scheduling/ +
//                       @nestjs/schedule). Fine for lightweight, global work.
//   --type=repeatable   BullMQ repeatable job, queued per tenant with a stable
//                       jobId. Preferred for tenant-specific or external-API work
//                       — retries/backoff come for free. Also writes a BullMQ
//                       WorkerHost processor.
//
// Both register the generated provider(s) into the owning module's
// <module>.module.ts automatically. See: skills/cron-jobs/SKILL.md
//
// Usage:
//   node scripts/generators/generate-cron-job.js --module=billing --name=invoice-sync --type=cron
//   node scripts/generators/generate-cron-job.js --module=billing --name=invoice-check --type=repeatable --pattern="*/1 * * * *"
//
// Safe to re-run: refuses to overwrite an existing cron file; re-running
// with the same --name skips provider registration if already present.

const fs = require('fs');
const path = require('path');
const { toKebabCase, toPascalCase, toCamelCase } = require('./_lib/casing');
const { log, ok, note, warn, fail } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { renderTemplate } = require('./_lib/render-template');
const { repoRoot, writeFile, readTemplate } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const TEMPLATES_DIR = path.join(__dirname, '_templates', 'cron');
const VALID_TYPES = ['cron', 'repeatable'];
const DEFAULT_PATTERN = '0 */6 * * *'; // every 6 hours

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-cron-job.js --module=<feature> --name=<job> [--type=cron|repeatable] [--pattern="<cron expr>"]

  --type defaults to "cron" (in-process @Cron(), good for lightweight global sweeps).
  --pattern defaults to "${DEFAULT_PATTERN}" (every 6 hours).

Examples:
  node scripts/generators/generate-cron-job.js --module=billing --name=invoice-sync
  node scripts/generators/generate-cron-job.js --module=billing --name=invoice-check --type=repeatable --pattern="*/1 * * * *"
`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.module || args.module === true || !args.name || args.name === true) printUsageAndExit();

  const type = args.type === true || args.type === undefined ? 'cron' : args.type;
  if (!VALID_TYPES.includes(type)) {
    fail(`--type must be one of: ${VALID_TYPES.join(', ')} (got "${type}")`);
  }
  if (args.type === undefined) note(`--type not given, defaulting to "cron" (use --type=repeatable for tenant-specific/external-API work)`);

  const pattern = typeof args.pattern === 'string' ? args.pattern : DEFAULT_PATTERN;

  const moduleKey = toKebabCase(args.module);
  const moduleDir = path.join(ROOT, 'apps/api/src/modules', moduleKey);
  const moduleFile = path.join(moduleDir, `${moduleKey}.module.ts`);
  if (!fs.existsSync(moduleDir) || !fs.existsSync(moduleFile)) {
    fail(
      `apps/api/src/modules/${moduleKey}/ does not exist.\n` +
        `  Create it first: node scripts/generators/generate-module.js --name=${moduleKey}`,
    );
  }

  const jobKey = toKebabCase(args.name);
  const JobName = toPascalCase(args.name);
  const jobName = toCamelCase(args.name);
  const vars = { moduleKey, jobKey, JobName, jobName, cronPattern: pattern };

  log(`Adding ${type} cron job "${jobKey}" to module "${moduleKey}" (pattern: "${pattern}")`);

  const cronFilePath = path.join(moduleDir, 'cron', `${jobKey}.cron.ts`);
  if (fs.existsSync(cronFilePath)) {
    fail(`apps/api/src/modules/${moduleKey}/cron/${jobKey}.cron.ts already exists — refusing to overwrite.`);
  }

  const imports = [];
  const providerNames = [`${JobName}Cron`];

  log('Writing files from scripts/generators/_templates/cron/');
  if (type === 'cron') {
    writeFile(cronFilePath, renderTemplate(readTemplate(TEMPLATES_DIR, 'in-process.cron.ts.tpl'), vars), { rootForLog: ROOT });
    imports.push(`import { ${JobName}Cron } from './cron/${jobKey}.cron';`);
  } else {
    writeFile(cronFilePath, renderTemplate(readTemplate(TEMPLATES_DIR, 'repeatable.cron.ts.tpl'), vars), { rootForLog: ROOT });
    const processorFilePath = path.join(moduleDir, 'cron', `${jobKey}-cron.processor.ts`);
    writeFile(processorFilePath, renderTemplate(readTemplate(TEMPLATES_DIR, 'repeatable.cron.processor.ts.tpl'), vars), {
      rootForLog: ROOT,
    });
    imports.push(`import { ${JobName}Cron } from './cron/${jobKey}.cron';`);
    imports.push(`import { ${JobName}CronProcessor } from './cron/${jobKey}-cron.processor';`);
    providerNames.push(`${JobName}CronProcessor`);
  }
  ok('cron file(s) written');

  log(`Registering ${providerNames.join(', ')} in apps/api/src/modules/${moduleKey}/${moduleKey}.module.ts`);
  registerInModuleFile(
    moduleFile,
    `apps/api/src/modules/${moduleKey}/${moduleKey}.module.ts`,
    imports,
    providerNames,
    type === 'repeatable' ? jobKey : null,
  );

  log('Done');
  console.log(`  Cron job: apps/api/src/modules/${moduleKey}/cron/${jobKey}.cron.ts  (type: ${type}, pattern: "${pattern}")`);
  if (type === 'repeatable') {
    console.log(`  Processor: apps/api/src/modules/${moduleKey}/cron/${jobKey}-cron.processor.ts`);
  }
  console.log('');
  console.log('Next steps:');
  if (type === 'cron') {
    console.log(`  Fill in the TODO in ${jobKey}.cron.ts — do the per-tenant work, or fan out into a queue.`);
  } else {
    console.log(`  Fill in the TODO in ${jobKey}-cron.processor.ts — do the per-tenant work for each job.`);
  }
  console.log('');
}

function registerInModuleFile(modulePath, displayPath, importLines, providerNames, queueName) {
  let content = fs.readFileSync(modulePath, 'utf8');
  let changed = false;

  if (queueName) {
    const bullImport = "import { BullModule } from '@nestjs/bullmq';";
    if (!importLines.includes(bullImport)) importLines.unshift(bullImport);
  }

  for (const importLine of importLines) {
    if (content.includes(importLine)) continue;
    const importRegex = /^import .+;$/gm;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content))) lastImportMatch = match;
    if (!lastImportMatch) {
      warn(`Could not find an import statement in ${displayPath} to anchor "${importLine}" after — add it by hand.`);
      continue;
    }
    const insertAt = lastImportMatch.index + lastImportMatch[0].length;
    content = content.slice(0, insertAt) + `\n${importLine}` + content.slice(insertAt);
    changed = true;
  }

  if (queueName) {
    const queueRegistration = `BullModule.registerQueue({ name: '${queueName}' })`;
    if (!content.includes(queueRegistration)) {
      if (content.includes('imports: [')) {
        content = content.replace('imports: [', `imports: [\n    ${queueRegistration},`);
        changed = true;
      } else {
        content = content.replace('@Module({', `@Module({\n  imports: [\n    ${queueRegistration},\n  ],`);
        changed = true;
      }
    }
  }

  const marker = '// cron providers are registered below this line, one per generated job — see scripts/generators/generate-cron-job.js';
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    warn(`Could not find the cron-provider registration marker in ${displayPath} — add ${providerNames.join(', ')} to its providers array by hand.`);
  } else {
    const toAdd = providerNames.filter((p) => !content.includes(`    ${p},`));
    if (toAdd.length) {
      const markerEnd = markerIndex + marker.length;
      const insertion = toAdd.map((p) => `\n    ${p},`).join('');
      content = content.slice(0, markerEnd) + insertion + content.slice(markerEnd);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(modulePath, content, 'utf8');
    ok(`registered ${providerNames.join(', ')} in ${displayPath}`);
  } else {
    note(`${displayPath} already registers ${providerNames.join(', ')} — skipping`);
  }
}

main();
