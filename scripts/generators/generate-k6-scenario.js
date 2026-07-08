#!/usr/bin/env node
//
// generate-k6-scenario.js
//
// Scaffolds a k6 CRUD scenario for a tenant-scoped module and wires it into
// tests/k6/main.js (import + call block) via the generated-scenario markers.
//
// Usage:
//   node scripts/generators/generate-k6-scenario.js --model=employee --fields=name:string,email:email
//   node scripts/generators/generate-k6-scenario.js --model="sales order" --module=sales-orders --fields=number:string,total:number
//
// --fields uses the same name:type syntax as generate-crud.js so the two can
// be run back to back with identical arguments.

const fs = require('fs');
const path = require('path');
const { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } = require('./_lib/casing');
const { fail, log, ok, warn } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { repoRoot, writeFile } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const MAIN_JS = path.join(ROOT, 'tests/k6/main.js');
const IMPORT_MARKER =
  '// generated scenario imports are appended below this line — see scripts/generators/generate-k6-scenario.js';
const CALL_MARKER =
  '// generated module scenario calls are inserted below this line — see scripts/generators/generate-k6-scenario.js';

const FIELD_TYPES = new Set(['string', 'text', 'email', 'phone', 'number', 'boolean', 'date']);

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-k6-scenario.js --model=<model> [--fields=<name:type,...>] [--module=<feature>] [--base-path=/<route>]

Supported field types (same as generate:crud):
  string, text, email, phone, number, boolean, date

Examples:
  node scripts/generators/generate-k6-scenario.js --model=employee --fields=name:string,phone:phone,email:email
  node scripts/generators/generate-k6-scenario.js --model="sales order" --fields=number:string,total:number
`);
  process.exit(1);
}

function pluralizeKebab(key) {
  const parts = key.split('-');
  const last = parts[parts.length - 1];
  if (last.endsWith('y') && !/[aeiou]y$/.test(last)) {
    parts[parts.length - 1] = `${last.slice(0, -1)}ies`;
  } else if (!last.endsWith('s')) {
    parts[parts.length - 1] = `${last}s`;
  }
  return parts.join('-');
}

function parseFields(raw) {
  if (!raw || raw === true) return [{ key: 'name', type: 'string' }];
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawName, rawType] = part.split(':').map((value) => value?.trim());
      const key = toCamelCase(rawName || '');
      const type = rawType || 'string';
      if (!key) fail(`Invalid field name in "${part}"`);
      if (['id', 'createdAt', 'updatedAt'].includes(key)) {
        fail(`"${key}" is managed by the CRUD generator and cannot be declared as a field.`);
      }
      if (!FIELD_TYPES.has(type)) {
        fail(`Unsupported field type "${type}" for "${key}". Supported: ${Array.from(FIELD_TYPES).join(', ')}`);
      }
      return { key, type };
    });
}

// Returns a JS source expression producing a unique-ish sample value per VU/iteration.
function sampleValue(field, modelKey) {
  const snake = toSnakeCase(field.key);
  switch (field.type) {
    case 'text':
      return `\`Test ${modelKey} ${'${index}'} ${'${__VU}'}-${'${__ITER}'} ${snake}\``;
    case 'email':
      return `\`${modelKey}-${'${index}'}-vu${'${__VU}'}-${'${__ITER}'}@example.com\``;
    case 'phone':
      return `\`+1555${'${String(1000000 + index).slice(1)}'}\``;
    case 'number':
      return 'index';
    case 'boolean':
      return 'true';
    case 'date':
      return 'new Date().toISOString()';
    default:
      return `\`${toPascalCase(field.key)} ${'${index}'} - ${'${__VU}'}-${'${__ITER}'}\``;
  }
}

function updateValue(field) {
  switch (field.type) {
    case 'number':
      return '999';
    case 'boolean':
      return 'false';
    case 'date':
      return 'new Date().toISOString()';
    case 'email':
      return `\`updated-${'${id}'}@example.com\``;
    default:
      return `\`Updated ${field.key} for ${'${id}'}\``;
  }
}

function scenarioSource(vars) {
  const payloadLines = vars.fields
    .map((field) => `    ${field.key}: ${sampleValue(field, vars.modelKey)},`)
    .join('\n');
  const updateField = vars.fields[0];

  return `import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function create${vars.ModelName}(token, tenantId, index) {
  const payload = {
${payloadLines}
  };

  const res = makeRequest('POST', '${vars.basePath}', payload, {
    Authorization: \`Bearer \${token}\`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    '${vars.modelLower} created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function list${vars.ModelsName}(token, tenantId) {
  const res = makeRequest('GET', '${vars.basePath}', null, {
    Authorization: \`Bearer \${token}\`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    '${vars.modelsLower} listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function update${vars.ModelName}(token, tenantId, id) {
  const payload = {
    ${updateField.key}: ${updateValue(updateField)},
  };

  const res = makeRequest('PATCH', \`${vars.basePath}/\${id}\`, payload, {
    Authorization: \`Bearer \${token}\`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    '${vars.modelLower} updated': (r) => r && r.status === 200,
  });
}

export function delete${vars.ModelName}(token, tenantId, id) {
  const res = makeRequest('DELETE', \`${vars.basePath}/\${id}\`, null, {
    Authorization: \`Bearer \${token}\`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    '${vars.modelLower} deleted': (r) => r && r.status === 200,
  });
}
`;
}

function callBlock(vars) {
  return `
    // ${vars.ModelsName}
    const ${vars.modelName}Res = create${vars.ModelName}(tenantToken, tenantId, 1);
    if (${vars.modelName}Res && ${vars.modelName}Res.id) {
      list${vars.ModelsName}(tenantToken, tenantId);
      update${vars.ModelName}(tenantToken, tenantId, ${vars.modelName}Res.id);
      delete${vars.ModelName}(tenantToken, tenantId, ${vars.modelName}Res.id);
    }`;
}

function wireMain(vars) {
  let content = fs.readFileSync(MAIN_JS, 'utf8');
  const importLine = `import { create${vars.ModelName}, list${vars.ModelsName}, update${vars.ModelName}, delete${vars.ModelName} } from './scenarios/${vars.modelKey}.js';`;

  if (content.includes(importLine)) {
    warn(`tests/k6/main.js already imports the ${vars.modelKey} scenario — skipping wiring.`);
    return;
  }

  const importAt = content.indexOf(IMPORT_MARKER);
  if (importAt === -1) {
    warn(`Could not find import marker in tests/k6/main.js. Add by hand:\n${importLine}`);
  } else {
    const at = importAt + IMPORT_MARKER.length;
    content = `${content.slice(0, at)}\n${importLine}${content.slice(at)}`;
  }

  const callAt = content.indexOf(CALL_MARKER);
  if (callAt === -1) {
    warn(`Could not find call marker in tests/k6/main.js. Add the CRUD calls by hand inside default().`);
  } else {
    const at = callAt + CALL_MARKER.length;
    content = `${content.slice(0, at)}${callBlock(vars)}${content.slice(at)}`;
  }

  fs.writeFileSync(MAIN_JS, content, 'utf8');
  ok(`wired ${vars.modelKey} scenario into tests/k6/main.js`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.model || args.model === true) printUsageAndExit();

  const modelKey = toKebabCase(String(args.model));
  const moduleKey = args.module && args.module !== true ? toKebabCase(String(args.module)) : pluralizeKebab(modelKey);
  const basePath =
    args['base-path'] && args['base-path'] !== true ? String(args['base-path']) : `/${moduleKey}`;
  if (!basePath.startsWith('/')) fail('--base-path must start with "/"');

  const vars = {
    modelKey,
    moduleKey,
    basePath,
    fields: parseFields(args.fields),
    modelName: toCamelCase(modelKey),
    ModelName: toPascalCase(modelKey),
    ModelsName: toPascalCase(moduleKey),
    modelLower: toKebabCase(modelKey).replace(/-/g, ' '),
    modelsLower: toKebabCase(moduleKey).replace(/-/g, ' '),
  };

  log(`Generating k6 scenario tests/k6/scenarios/${modelKey}.js (routes ${basePath})`);
  const created = writeFile(path.join(ROOT, 'tests/k6/scenarios', `${modelKey}.js`), scenarioSource(vars), {
    rootForLog: ROOT,
  });
  if (!created) fail(`tests/k6/scenarios/${modelKey}.js already exists — refusing to overwrite.`);

  wireMain(vars);

  ok('Done. Run the suite with: k6 run tests/k6/main.js');
}

main();
