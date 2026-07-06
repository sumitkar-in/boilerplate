# Query Performance and Cache Audit

## Cache Layer

The API now exposes a reusable `CacheService` from the global Redis module.
Use `remember(key, ttl, loader)` for read-through caching and invalidate beside
the write that changes the cached data.

Current cache keys:

- `tenant:slug:{slug}`: tenant lookup by slug, 300s.
- `tenant:{tenantId}:record`: tenant lookup by id, 300s.
- `tenant:{tenantId}:public-branding`: public branding payload, 300s.
- `tenant:{tenantId}:settings`: tenant settings and dashboard config, 120s.
- `tenant:{tenantId}:features`: enabled feature keys, 60s.
- `tenant:{tenantId}:menu-order`: tenant navigation order, 300s.
- `tenant:global:menu-order`: platform navigation order, 300s.
- `tenant:{tenantId}:roles`: tenant role list, 120s.
- `tenant:{tenantId}:role:{roleKey}:permissions`: role permission list, 300s.
- `tenant:{tenantId}:tasks:projects`: task project metadata, 120s.
- `tenant:{tenantId}:tasks:custom-fields`: task custom field definitions, 120s.
- `tenant:{tenantId}:documents:spaces`: document space metadata, 120s.
- `tenant:{tenantId}:bpql:tables`: BPQL table metadata, 120s.
- `tenant:{tenantId}:bpql:table:{slug}`: BPQL table definition, 120s.
- `tenant:{tenantId}:employees:custom-fields`: employee custom field definitions, 120s.

Invalidation is explicit and tenant-scoped. Tenant settings, branding, roles,
membership, feature changes, menu preferences, task metadata, document spaces,
BPQL table definitions, and employee custom fields clear the matching keys when
mutated.

## Query Indexes Added

Core schema:

- Tenant status lookup.
- Tenant membership tenant/status and user lookup.
- Tenant role, feature flag, invite, refresh token, and audit-log access paths.

Tenant modules:

- Tasks: `updated_at`, project/status sorting, primary assignee, JSONB assignee
  and watcher filters, labels, comments, activity, and custom-field ordering.
- Documents: space name ordering, page space/update sorting, labels, comments,
  and revision history.
- BPQL: row table/update sorting and JSONB row data.
- Employees: update sorting, JSONB custom fields, and custom-field ordering.
- Notes: update sorting and title lookup.
- Departments: update sorting.

## Audit Notes

The remaining potentially expensive operations are generic text searches:

- `listAndCount` supports `ILIKE '%term%'` across searchable columns.
- BPQL free-text search uses `bpql_rows.data::text ILIKE`.
- BPQL field `contains` filters use `data->>field ILIKE`.

These are acceptable for starter-project datasets but should be measured under
production data. For larger tenants, add PostgreSQL trigram indexes
(`pg_trgm`) or module-specific full-text search indexes based on actual search
requirements.

Avoid caching highly dynamic paginated list results by default. Prefer indexing,
bounded pagination, and module-specific cache keys only after measuring a stable
query shape.
