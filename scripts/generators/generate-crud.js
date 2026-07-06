#!/usr/bin/env node
//
// generate-crud.js
//
// Scaffolds a complete tenant-scoped CRUD feature:
// - NestJS module with Drizzle entity, migration, DTOs, service, controller
// - Web module with API helpers, route, module config, and CRUD page
//
// Usage:
//   node scripts/generators/generate-crud.js --model=employee --fields=name:string,phone:phone,email:email
//   node scripts/generators/generate-crud.js --model="sales order" --module=sales-orders --fields=number:string,total:number

const fs = require('fs');
const path = require('path');
const {
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
} = require('./_lib/casing');
const { fail, log, ok, warn } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { keepDir, repoRoot, writeFile } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const APP_MODULE_MARKER =
  '// feature modules are registered below this line, one per generated module — see scripts/generators/generate-module.js';
const WEB_LOADER_MARKER =
  '// new modules are appended below this line — see scripts/generators/generate-frontend-module.js';

const FIELD_TYPES = new Set([
  'string',
  'text',
  'email',
  'phone',
  'number',
  'boolean',
  'date',
]);

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-crud.js --model=<model> --fields=<name:type,email:email,...> [--module=<feature>] [--label="<Label>"]

Supported field types:
  string, text, email, phone, number, boolean, date

Examples:
  node scripts/generators/generate-crud.js --model=employee --fields=name:string,phone:phone,email:email
  node scripts/generators/generate-crud.js --model="sales order" --fields=number:string,total:number
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
  if (!raw || raw === true) printUsageAndExit();
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawName, rawType] = part.split(':').map((value) => value?.trim());
      const key = toCamelCase(rawName || '');
      const snake = toSnakeCase(rawName || '');
      const label = toTitleCase(rawName || '');
      const type = rawType || 'string';
      if (!key || !snake) fail(`Invalid field name in "${part}"`);
      if (['id', 'createdAt', 'updatedAt'].includes(key)) {
        fail(`"${key}" is managed by the CRUD generator and cannot be declared as a field.`);
      }
      if (!FIELD_TYPES.has(type)) {
        fail(`Unsupported field type "${type}" for "${key}". Supported: ${Array.from(FIELD_TYPES).join(', ')}`);
      }
      return { key, snake, label, type };
    });
}

function fieldTsType(field) {
  if (field.type === 'number') return 'number';
  if (field.type === 'boolean') return 'boolean';
  return 'string';
}

function drizzleColumn(field) {
  if (field.type === 'text') return `text('${field.snake}').notNull()`;
  if (field.type === 'email') return `varchar('${field.snake}', { length: 320 }).notNull()`;
  if (field.type === 'phone') return `varchar('${field.snake}', { length: 32 }).notNull()`;
  if (field.type === 'number') return `integer('${field.snake}').notNull()`;
  if (field.type === 'boolean') return `boolean('${field.snake}').notNull().default(false)`;
  if (field.type === 'date') return `timestamp('${field.snake}', { withTimezone: true }).notNull()`;
  return `varchar('${field.snake}', { length: 255 }).notNull()`;
}

function sqlColumn(field) {
  if (field.type === 'text') return `${field.snake} text NOT NULL`;
  if (field.type === 'email') return `${field.snake} varchar(320) NOT NULL`;
  if (field.type === 'phone') return `${field.snake} varchar(32) NOT NULL`;
  if (field.type === 'number') return `${field.snake} integer NOT NULL`;
  if (field.type === 'boolean') return `${field.snake} boolean NOT NULL DEFAULT false`;
  if (field.type === 'date') return `${field.snake} timestamptz NOT NULL`;
  return `${field.snake} varchar(255) NOT NULL`;
}

function validatorImports(fields) {
  const imports = new Set();
  for (const field of fields) {
    if (field.type === 'email') imports.add('IsEmail');
    else if (field.type === 'number') imports.add('IsNumber');
    else if (field.type === 'boolean') imports.add('IsBoolean');
    else imports.add('IsString');
  }
  return Array.from(imports).sort();
}

function dtoDecorators(field) {
  const decorators = [];
  if (field.type === 'email') decorators.push('@IsEmail()');
  else if (field.type === 'number') decorators.push('@IsNumber()');
  else if (field.type === 'boolean') decorators.push('@IsBoolean()');
  else decorators.push('@IsString()');
  return decorators.join('\n  ');
}

function uniqueDrizzleImports(fields) {
  const imports = new Set(['pgTable', 'timestamp', 'uuid']);
  for (const field of fields) {
    if (['string', 'email', 'phone'].includes(field.type)) imports.add('varchar');
    if (field.type === 'text') imports.add('text');
    if (field.type === 'number') imports.add('integer');
    if (field.type === 'boolean') imports.add('boolean');
  }
  return Array.from(imports).sort();
}

function writeBackend(vars) {
  const dir = path.join(ROOT, 'apps/api/src/modules', vars.moduleKey);
  if (fs.existsSync(dir)) {
    fail(`apps/api/src/modules/${vars.moduleKey}/ already exists — refusing to overwrite.`);
  }

  log(`Writing backend CRUD module apps/api/src/modules/${vars.moduleKey}/`);
  writeFile(path.join(dir, 'feature.json'), backendFeatureJson(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, `${vars.moduleKey}.module.ts`), backendModule(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, `${vars.moduleKey}.controller.ts`), backendController(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, `${vars.moduleKey}.service.ts`), backendService(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'entities', `${vars.modelKey}.ts`), backendEntity(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'dto', `create-${vars.modelKey}.dto.ts`), createDto(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'dto', `update-${vars.modelKey}.dto.ts`), updateDto(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'migrations', `0001_create_${vars.tableName}.sql`), migration(vars), { rootForLog: ROOT });
  keepDir(path.join(dir, 'jobs'), ROOT);
  keepDir(path.join(dir, 'cron'), ROOT);
  registerApiModule(vars);
}

function writeWeb(vars) {
  const dir = path.join(ROOT, 'apps/web/src/modules', vars.moduleKey);
  if (fs.existsSync(dir)) {
    fail(`apps/web/src/modules/${vars.moduleKey}/ already exists — refusing to overwrite.`);
  }

  log(`Writing web CRUD module apps/web/src/modules/${vars.moduleKey}/`);
  writeFile(path.join(dir, 'module.config.ts'), webModuleConfig(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'routes.tsx'), webRoutes(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'api', 'index.ts'), webApi(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'pages', `${vars.ModelName}Page.tsx`), webPage(vars), { rootForLog: ROOT });
  keepDir(path.join(dir, 'components'), ROOT);
  keepDir(path.join(dir, 'store'), ROOT);
  registerWebModule(vars);
}

function writeMobile(vars) {
  const dir = path.join(ROOT, 'apps/mobile/src/modules', vars.moduleKey);
  if (fs.existsSync(dir)) {
    fail(`apps/mobile/src/modules/${vars.moduleKey}/ already exists — refusing to overwrite.`);
  }

  log(`Writing mobile CRUD module apps/mobile/src/modules/${vars.moduleKey}/`);
  writeFile(path.join(dir, 'module.config.ts'), webModuleConfig(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'navigation.tsx'), mobileNavigation(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'api', 'index.ts'), webApi(vars), { rootForLog: ROOT });
  writeFile(path.join(dir, 'screens', `${vars.ModelName}Screen.tsx`), mobileScreen(vars), { rootForLog: ROOT });
  keepDir(path.join(dir, 'components'), ROOT);
  keepDir(path.join(dir, 'store'), ROOT);
  registerMobileModule(vars);
}

function registerApiModule(vars) {
  const file = path.join(ROOT, 'apps/api/src/app.module.ts');
  let content = fs.readFileSync(file, 'utf8');
  const importLine = `import { ${vars.ModelName}Module } from './modules/${vars.moduleKey}/${vars.moduleKey}.module';`;
  if (!content.includes(importLine)) {
    const imports = [...content.matchAll(/^import .+;$/gm)];
    const last = imports[imports.length - 1];
    if (!last) warn('Could not register API module import.');
    else {
      const at = last.index + last[0].length;
      content = `${content.slice(0, at)}\n${importLine}${content.slice(at)}`;
    }
  }
  if (!content.includes(`    ${vars.ModelName}Module,`)) {
    const markerAt = content.indexOf(APP_MODULE_MARKER);
    if (markerAt === -1) warn('Could not find API module registration marker.');
    else {
      const at = markerAt + APP_MODULE_MARKER.length;
      content = `${content.slice(0, at)}\n    ${vars.ModelName}Module,${content.slice(at)}`;
    }
  }
  fs.writeFileSync(file, content, 'utf8');
  ok(`registered ${vars.ModelName}Module in apps/api/src/app.module.ts`);
}

function registerWebModule(vars) {
  const file = path.join(ROOT, 'apps/web/src/core/module-loader.ts');
  let content = fs.readFileSync(file, 'utf8');
  const entry = `  { key: '${vars.moduleKey}', load: () => import('../modules/${vars.moduleKey}/routes') },`;
  if (content.includes(entry)) return;
  const markerAt = content.indexOf(WEB_LOADER_MARKER);
  if (markerAt === -1) {
    warn(`Could not find web module-loader marker. Add by hand:\n${entry}`);
    return;
  }
  const at = markerAt + WEB_LOADER_MARKER.length;
  content = `${content.slice(0, at)}\n${entry}${content.slice(at)}`;
  fs.writeFileSync(file, content, 'utf8');
  ok(`registered ${vars.moduleKey} in apps/web/src/core/module-loader.ts`);
}

const MOBILE_LOADER_MARKER =
  '// new modules are appended below this line — see scripts/generators/generate-frontend-module.js';

function registerMobileModule(vars) {
  const file = path.join(ROOT, 'apps/mobile/src/core/module-loader.ts');
  let content = fs.readFileSync(file, 'utf8');
  const entry = `  { key: '${vars.moduleKey}', load: () => import('../modules/${vars.moduleKey}/navigation') },`;
  if (content.includes(entry)) return;
  const markerAt = content.indexOf(MOBILE_LOADER_MARKER);
  if (markerAt === -1) {
    warn(`Could not find mobile module-loader marker. Add by hand:\n${entry}`);
    return;
  }
  const at = markerAt + MOBILE_LOADER_MARKER.length;
  content = `${content.slice(0, at)}\n${entry}${content.slice(at)}`;
  fs.writeFileSync(file, content, 'utf8');
  ok(`registered ${vars.moduleKey} in apps/mobile/src/core/module-loader.ts`);
}

function backendFeatureJson(vars) {
  return JSON.stringify({ key: vars.moduleKey, label: vars.ModelLabel, defaultEnabled: false }, null, 2);
}

function backendModule(vars) {
  return `import { Module } from '@nestjs/common';
import { ${vars.ModelName}Controller } from './${vars.moduleKey}.controller';
import { ${vars.ModelName}Service } from './${vars.moduleKey}.service';

@Module({
  controllers: [${vars.ModelName}Controller],
  providers: [${vars.ModelName}Service],
  exports: [${vars.ModelName}Service],
})
export class ${vars.ModelName}Module {}
`;
}

function backendController(vars) {
  return `import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/common/decorators/current-tenant.decorator';
import { Permissions } from '../../core/common/decorators/permissions.decorator';
import { TenantModuleController } from '../../core/common/decorators/tenant-module-controller.decorator';
import { ListQueryDto } from '../../core/common/query/list-query.dto';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { Create${vars.ModelName}Dto } from './dto/create-${vars.modelKey}.dto';
import { Update${vars.ModelName}Dto } from './dto/update-${vars.modelKey}.dto';
import { ${vars.ModelName}Service } from './${vars.moduleKey}.service';

@TenantModuleController('${vars.moduleKey}')
export class ${vars.ModelName}Controller {
  constructor(private readonly ${vars.modelName}Service: ${vars.ModelName}Service) {}

  @Get()
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Lists ${vars.ModelLabelPlural} with search, filters, sorting, and pagination.' })
  findAll(@CurrentTenant() tenant: TenantContext, @Query() query: ListQueryDto) {
    return this.${vars.modelName}Service.findAll(tenant, query);
  }

  @Post()
  @Permissions('modules:create')
  @ApiCreatedResponse({ description: 'Creates a ${vars.ModelLabel}.' })
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: Create${vars.ModelName}Dto) {
    return this.${vars.modelName}Service.create(tenant, dto);
  }

  @Get(':id')
  @Permissions('modules:read')
  @ApiOkResponse({ description: 'Returns a ${vars.ModelLabel} by id.' })
  findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.${vars.modelName}Service.findOne(tenant, id);
  }

  @Patch(':id')
  @Permissions('modules:update')
  @ApiOkResponse({ description: 'Updates a ${vars.ModelLabel}.' })
  update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: Update${vars.ModelName}Dto) {
    return this.${vars.modelName}Service.update(tenant, id, dto);
  }

  @Delete(':id')
  @Permissions('modules:delete')
  @ApiOkResponse({ description: 'Deletes a ${vars.ModelLabel}.' })
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.${vars.modelName}Service.remove(tenant, id);
  }
}
`;
}

function backendService(vars) {
  return `import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  assertFound,
  listAndCount,
} from '../../core/common/crud/crud.helpers';
import type { ListQueryConfig } from '../../core/common/query/list-query.builder';
import type { ListQueryDto } from '../../core/common/query/list-query.dto';
import { TenantDbService } from '../../core/database/tenant-db.service';
import type { TenantContext } from '../../core/tenants/tenant-context';
import { Create${vars.ModelName}Dto } from './dto/create-${vars.modelKey}.dto';
import { Update${vars.ModelName}Dto } from './dto/update-${vars.modelKey}.dto';
import { ${vars.modelName} } from './entities/${vars.modelKey}';

const listConfig: ListQueryConfig = {
  fields: {
    createdAt: ${vars.modelName}.createdAt,
  },
  searchFields: [],
  defaultSort: { field: 'createdAt', direction: 'desc' },
};

@Injectable()
export class ${vars.ModelName}Service {
  constructor(private readonly tenantDb: TenantDbService) {}

  findAll(tenant: TenantContext, query: ListQueryDto = {}) {
    return this.tenantDb.withTenantDb(tenant, (db) =>
      listAndCount(db, ${vars.modelName}, query, listConfig),
    );
  }

  async findOne(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.select().from(${vars.modelName}).where(eq(${vars.modelName}.id, id)).limit(1),
    );
    return assertFound(row, '${vars.ModelLabel}');
  }

  async create(tenant: TenantContext, dto: Create${vars.ModelName}Dto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.insert(${vars.modelName}).values(dto).returning(),
    );
    return row;
  }

  async update(tenant: TenantContext, id: string, dto: Update${vars.ModelName}Dto) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db
        .update(${vars.modelName})
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(${vars.modelName}.id, id))
        .returning(),
    );
    return assertFound(row, '${vars.ModelLabel}');
  }

  async remove(tenant: TenantContext, id: string) {
    const [row] = await this.tenantDb.withTenantDb(tenant, (db) =>
      db.delete(${vars.modelName}).where(eq(${vars.modelName}.id, id)).returning({ id: ${vars.modelName}.id }),
    );
    assertFound(row, '${vars.ModelLabel}');
    return { ok: true };
  }
}
`;
}

function backendEntity(vars) {
  const fieldLines = vars.fields.map((field) => `  ${field.key}: ${drizzleColumn(field)},`).join('\n');
  return `import { ${uniqueDrizzleImports(vars.fields).join(', ')} } from 'drizzle-orm/pg-core';

export const ${vars.modelName} = pgTable('${vars.tableName}', {
  id: uuid('id').primaryKey().defaultRandom(),
${fieldLines}
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
`;
}

function createDto(vars) {
  const validatorImport = validatorImports(vars.fields).join(', ');
  const properties = vars.fields
    .map(
      (field) => `  @ApiProperty({ example: ${JSON.stringify(exampleValue(field))} })
  ${dtoDecorators(field)}
  ${field.key}!: ${fieldTsType(field)};`,
    )
    .join('\n\n');
  return `import { ApiProperty } from '@nestjs/swagger';
import { ${validatorImport} } from 'class-validator';

export class Create${vars.ModelName}Dto {
${properties}
}
`;
}

function updateDto(vars) {
  return `import { PartialType } from '@nestjs/swagger';
import { Create${vars.ModelName}Dto } from './create-${vars.modelKey}.dto';

export class Update${vars.ModelName}Dto extends PartialType(Create${vars.ModelName}Dto) {}
`;
}

function migration(vars) {
  const columns = vars.fields.map((field) => `  ${sqlColumn(field)},`).join('\n');
  return `CREATE TABLE IF NOT EXISTS ${vars.tableName} (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
${columns}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;
}

function webModuleConfig(vars) {
  return `import type { ModuleConfig } from '@boilerplate/contracts';

// Read by apps/web/src/core/module-loader.ts (and the mobile equivalent)
// to decide nav label/icon once this module is lazy-loaded. The \`key\`
// must match this module's feature.json key on the backend.
// See: skills/frontend-module/SKILL.md
export const moduleConfig: ModuleConfig = {
  key: '${vars.moduleKey}',
  label: '${vars.ModelLabelPlural}',
  navLabel: '${vars.ModelLabelPlural}',
};
`;
}

function webRoutes(vars) {
  return `import type { RouteObject } from 'react-router-dom';
import { ${vars.ModelName}Page } from './pages/${vars.ModelName}Page';

const routes: RouteObject[] = [{ index: true, element: <${vars.ModelName}Page /> }];

export { moduleConfig } from './module.config';

export default routes;
`;
}

function webApi(vars) {
  const fieldTypes = vars.fields.map((field) => `  ${field.key}: ${fieldTsType(field)};`).join('\n');
  return `import { apiFetch } from '../../../core/api-client';

export type ${vars.ModelName} = {
  id: string;
${fieldTypes}
  createdAt: string;
  updatedAt: string;
};

export type ${vars.ModelName}Input = {
${fieldTypes}
};

export function list${vars.ModelNamePlural}(): Promise<${vars.ModelName}[]> {
  return apiFetch<${vars.ModelName}[]>('/${vars.moduleKey}');
}

export function create${vars.ModelName}(input: ${vars.ModelName}Input): Promise<${vars.ModelName}> {
  return apiFetch<${vars.ModelName}>('/${vars.moduleKey}', { method: 'POST', body: input });
}

export function update${vars.ModelName}(id: string, input: Partial<${vars.ModelName}Input>): Promise<${vars.ModelName}> {
  return apiFetch<${vars.ModelName}>(\`/${vars.moduleKey}/\${id}\`, { method: 'PATCH', body: input });
}

export function delete${vars.ModelName}(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(\`/${vars.moduleKey}/\${id}\`, { method: 'DELETE' });
}
`;
}

function webPage(vars) {
  const initialState = vars.fields.map((field) => `  ${field.key}: ${defaultInputLiteral(field)},`).join('\n');
  const formFields = vars.fields.map((field) => webFormField(field)).join('\n\n');
  const tableHeaders = vars.fields.map((field) => `                <th>${field.label}</th>`).join('\n');
  const tableCells = vars.fields.map((field) => `                  <td>{String(row.${field.key})}</td>`).join('\n');
  return `import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  create${vars.ModelName},
  delete${vars.ModelName},
  list${vars.ModelNamePlural},
  update${vars.ModelName},
  type ${vars.ModelName},
  type ${vars.ModelName}Input,
} from '../api';

const emptyInput: ${vars.ModelName}Input = {
${initialState}
};

export function ${vars.ModelName}Page() {
  const [rows, setRows] = useState<${vars.ModelName}[] | null>(null);
  const [form, setForm] = useState<${vars.ModelName}Input>(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadRows() {
    setRows(await list${vars.ModelNamePlural}());
  }

  useEffect(() => {
    let cancelled = false;
    list${vars.ModelNamePlural}().then(
      (data) => {
        if (!cancelled) setRows(data);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load ${vars.ModelLabelPlural}');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setForm(emptyInput);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (editingId) await update${vars.ModelName}(editingId, form);
      else await create${vars.ModelName}(form);
      resetForm();
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save ${vars.ModelLabel}');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this ${vars.ModelLabel}?')) return;
    setError(null);
    try {
      await delete${vars.ModelName}(id);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete ${vars.ModelLabel}');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>${vars.ModelLabelPlural}</h1>
          <p className="hint-text">Create, update, and delete ${vars.ModelLabelPlural.toLowerCase()} for the current tenant.</p>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div className="section-grid">
        <section className="table-wrap" aria-label="${vars.ModelLabelPlural}">
          <table>
            <thead>
              <tr>
${tableHeaders}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr>
                  <td colSpan={${vars.fields.length + 1}} className="hint-text">Loading…</td>
                </tr>
              )}
              {rows?.map((row) => (
                <tr key={row.id}>
${tableCells}
                  <td>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm(${objectFromRow(vars.fields)});
                      }}
                    >
                      Edit
                    </button>{' '}
                    <button type="button" className="button button--ghost" onClick={() => void handleDelete(row.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={${vars.fields.length + 1}}>
                    <div className="empty-state">No ${vars.ModelLabelPlural.toLowerCase()} yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <form className="card card--compact" onSubmit={(event) => void handleSubmit(event)}>
          <h2>{editingId ? 'Edit ${vars.ModelLabel}' : 'Create ${vars.ModelLabel}'}</h2>
${formFields}
          <button type="submit" className="button button--block" disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Update ${vars.ModelLabel}' : 'Create ${vars.ModelLabel}'}
          </button>
          {editingId && (
            <button type="button" className="button button--ghost button--block" onClick={resetForm}>
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
`;
}

function objectFromRow(fields) {
  return `{ ${fields.map((field) => `${field.key}: row.${field.key}`).join(', ')} }`;
}

function webFormField(field) {
  const inputType = field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : field.type === 'phone' ? 'tel' : 'text';
  if (field.type === 'boolean') {
    return `          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.${field.key}}
              onChange={(event) => setForm((current) => ({ ...current, ${field.key}: event.target.checked }))}
            />
            ${field.label}
          </label>`;
  }
  return `          <label>
            ${field.label}
            <input
              type="${inputType}"
              value={form.${field.key}}
              onChange={(event) => setForm((current) => ({ ...current, ${field.key}: ${field.type === 'number' ? 'Number(event.target.value)' : 'event.target.value'} }))}
              required
            />
          </label>`;
}

function exampleValue(field) {
  if (field.type === 'email') return 'person@example.com';
  if (field.type === 'phone') return '+15551234567';
  if (field.type === 'number') return 100;
  if (field.type === 'boolean') return true;
  if (field.type === 'date') return '2026-01-01T00:00:00.000Z';
  if (field.key.toLowerCase().includes('name')) return 'Ada Lovelace';
  return `${field.label} value`;
}

function defaultInputLiteral(field) {
  if (field.type === 'number') return '0';
  if (field.type === 'boolean') return 'false';
  return "''";
}

function mobileNavigation(vars) {
  return `import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ${vars.ModelName}Screen } from './screens/${vars.ModelName}Screen';

const Stack = createNativeStackNavigator();

export default function ${vars.ModelName}Navigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="${vars.ModelName}List" component={${vars.ModelName}Screen} options={{ title: '${vars.ModelLabelPlural}' }} />
    </Stack.Navigator>
  );
}
`;
}

function mobileScreen(vars) {
  return `import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { list${vars.ModelNamePlural}, delete${vars.ModelName}, type ${vars.ModelName} } from '../api';

export function ${vars.ModelName}Screen() {
  const [items, setItems] = useState<${vars.ModelName}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await list${vars.ModelNamePlural}();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load ${vars.ModelLabelPlural.toLowerCase()}');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await delete${vars.ModelName}(id);
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={<Text style={styles.empty}>No ${vars.ModelLabelPlural.toLowerCase()} found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{String(item.${vars.fields[0]?.key || 'id'})}</Text>
            </View>
            <TouchableOpacity onPress={() => void handleDelete(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  error: { color: '#ef4444', marginBottom: 12 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 32 },
});
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.model || args.model === true || !args.fields || args.fields === true) printUsageAndExit();

  const modelKey = toKebabCase(args.model);
  const moduleKey = args.module && args.module !== true ? toKebabCase(args.module) : pluralizeKebab(modelKey);
  const ModelName = toPascalCase(args.model);
  const ModelNamePlural = toPascalCase(moduleKey);
  const modelName = toCamelCase(args.model);
  const ModelLabel = typeof args.label === 'string' ? args.label : toTitleCase(args.model);
  const ModelLabelPlural = toTitleCase(moduleKey);
  const tableName = toSnakeCase(moduleKey);
  const fields = parseFields(args.fields);

  if (!modelKey || !moduleKey) fail('Model/module name did not produce a usable key.');

  const vars = {
    fields,
    modelKey,
    moduleKey,
    ModelName,
    ModelNamePlural,
    modelName,
    ModelLabel,
    ModelLabelPlural,
    tableName,
  };

  writeBackend(vars);
  writeWeb(vars);
  writeMobile(vars);

  log('Done');
  console.log(`  API route: /${moduleKey}`);
  console.log(`  Backend:   apps/api/src/modules/${moduleKey}/`);
  console.log(`  Web UI:    apps/web/src/modules/${moduleKey}/`);
  console.log(`  Mobile UI: apps/mobile/src/modules/${moduleKey}/`);
  console.log('');
  console.log('Next steps:');
  console.log(`  pnpm migrate:module ${moduleKey}`);
  console.log(`  Enable feature "${moduleKey}" for a tenant, then open /${moduleKey} in the web/mobile app.`);
}

main();
