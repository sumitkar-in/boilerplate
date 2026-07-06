---
name: crud-module
description: Generate tenant-scoped NestJS CRUD endpoints and matching web UI pages for a model in this boilerplate.
---

# Skill: CRUD Module Generator

Use this when adding a simple tenant-scoped CRUD model that needs API endpoints and a web page.

## Command

```bash
pnpm generate:crud --model=employee --fields=name:string,phone:phone,email:email
```

This creates:

- `apps/api/src/modules/<models>/` with module, controller, service, DTOs, Drizzle entity, and migration.
- `apps/web/src/modules/<models>/` with module config, route, API helpers, and a CRUD page.
- Registrations in `apps/api/src/app.module.ts` and `apps/web/src/core/module-loader.ts`.

`--model=employee` defaults to module/route/feature key `employees`.

## Field Syntax

Pass comma-separated `name:type` pairs:

```bash
--fields=name:string,phone:phone,email:email
```

Supported types:

- `string`
- `text`
- `email`
- `phone`
- `number`
- `boolean`
- `date`

The generator always adds `id`, `createdAt`, and `updatedAt`.

## Options

```bash
pnpm generate:crud --model=employee --module=staff --label="Employee" --fields=name:string,email:email
```

- `--module` overrides the default plural feature key.
- `--label` overrides the display label for a single row.

## After Generating

Run migrations for tenants that should use the feature:

```bash
pnpm migrate:module employees
```

Enable the feature key for the tenant, then open the generated page in the web app.

## List Endpoints: Search, Filters, Sorting, Pagination

Every list endpoint should use the reusable list-query mechanism in
`apps/api/src/core/common/query/` and the `listAndCount` helper instead of
hand-rolling query params:

1. The controller takes `@Query() query: ListQueryDto` (or a subclass adding
   module-specific params — see `QueryEmployeesDto`'s `departmentId`).
   `ListQueryDto` provides `search`, `filters` (JSON array of
   `{field, operator, value}`), `sortBy`, `sortDir`, `limit`, `offset`.
2. The service declares one `ListQueryConfig` — which columns are
   filterable/sortable, which back free-text `search`, an optional jsonb
   column for dynamic `custom:<key>` fields, and the default sort — then
   calls `listAndCount(db, table, query, config, extraConditions)` inside
   `withTenantDb()` to handle search/filter/sort/pagination and return the
   `{ rows, total, limit, offset }` envelope. See `notes.service.ts`,
   `employees.service.ts`, and `departments.service.ts` for the pattern.
   Module-specific conditions (e.g. `departmentId` in employees) are passed
   via the optional `extraConditions` parameter.
3. The web page renders the envelope with `AdvancedDataTable`
   (`@boilerplate/ui-common`): controlled `searchValue`/`onSearchChange` for
   server-side search, the `pagination` prop for server-side paging, and the
   table's built-in excel-style column filters/sort on the loaded page.

This applies to core/admin tables too. If a page renders tabular data, prefer
`AdvancedDataTable` and a `{ rows, total, limit, offset }` API envelope. Do
not add new plain `<table>` screens unless the table is static and too small
to need search/filter/sort/pagination.

Shared role keys, module config types, API list envelopes, and storage keys
come from `@boilerplate/contracts`. Generated CRUD code should import those
contracts instead of declaring duplicate local unions or string constants.

Filter operators (shared by backend and table): `contains`, `startsWith`,
`endsWith`, `equals`, `notEquals`, `notContains`, `blank`, `notBlank`.

## Custom Fields (user-defined columns)

The employees module is the reference for letting tenants add their own
fields from the UI without a migration:

- A `<table>_custom_fields` definitions table (`field_key`, `label`, `type`
  in text|number|date|select, `options` jsonb) plus a `custom_fields` jsonb
  column on the data table — see `employees/migrations/0003_*.sql`.
- The service sanitizes incoming values against the definitions and merges
  updates with jsonb `||` so single-cell edits don't wipe other keys.
- `custom:<fieldKey>` works everywhere a field key is accepted: list
  `filters`, `sortBy`, and the table's column set on the frontend.
- Frontend: definitions are managed in the module's column-manager modal
  and rendered as typed inputs/columns (`useEmployeeColumns`,
  `EmployeeFormModal`).

Copy this trio (definitions table + jsonb column + `customFieldsColumn` in
the `ListQueryConfig`) when a new model needs UI-defined fields.

## Async CSV Export/Import (worker)

Bulk CSV work never runs in the API process. The employees module is the
reference implementation:

- `POST /<models>/export` and `POST /<models>/import` enqueue BullMQ jobs
  (`employee-csv.service.ts`); `GET /<models>/jobs/:id` polls status and
  `GET /<models>/jobs/:id/download` streams a finished export.
- The consumer (`jobs/employee-csv.processor.ts`) is registered ONLY in
  `apps/api/src/worker.module.ts` — the headless worker process. Run it with
  `pnpm dev:worker` locally or the `worker` service in
  `infra/docker/docker-compose.yml`. Export files go through
  `StorageService`; CSV parsing/serialization uses
  `apps/api/src/core/common/csv.ts`.
- Frontend: `EmployeeCsvActions` enqueues, polls with
  `waitForEmployeeCsvJob()`, then downloads / shows the import summary.

## Error Handling

Unique constraint violations (Postgres error code 23505) are handled globally
by `PostgresExceptionFilter` (registered in `app.module.ts`) and converted to
HTTP 409 Conflict with the violation message derived from the constraint
definition. **Do not catch 23505 in service methods** — let the error propagate
so the global filter can map it; create/update methods never need try/catch
for this case. Use `assertFound(row, 'EntityName')` for not-found checks
instead of manual NotFoundException throws.

## Rules

- Use this only for straightforward CRUD. For workflows, approvals, custom joins, or business-heavy endpoints, generate the CRUD base and then edit the module manually.
- Keep tenant table access inside the generated module service. Other modules should call the generated service instead of importing its entity directly.
- **UI Localization (i18n)**: All UI texts in generated pages and components MUST use `useTranslation()` from `react-i18next`. Do not hardcode user-facing strings.
- **Icons**: Never use emojis in the UI. Always use clean icon components from standard libraries such as `lucide-react`.
- **Component Size**: Break down complex UI into smaller reusable components. Pages and components must avoid exceeding 150 lines of code per file.
- **Tenant users**: Tenant owners add active users through `POST /auth/users`;
  super admins add active tenant users through
  `POST /auth/super-admin/tenants/:tenantId/users`. Keep invites for
  out-of-band acceptance flows only.
- **Menu order**: Tenant menu order is persisted through
  `GET/PATCH /tenants/menu-order`; platform defaults and tenant overrides are
  managed by super admins through `GET/PATCH /admin/tenants/menu-order` and
  `GET/PATCH /admin/tenants/:id/menu-order`. Always validate submitted keys
  against the tenant's available module/menu keys.
