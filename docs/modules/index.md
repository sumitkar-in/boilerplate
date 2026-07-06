# Boilerplate Modules Guide

This document provides a comprehensive guide to the module architecture in this boilerplate. The boilerplate is designed around a **Modular, multi-tenant, extendable** architecture where each feature is encapsulated within its own module.

## Module Architecture

Every backend feature lives in `apps/api/src/modules/<feature>/` and follows a strict shape:

```text
apps/api/src/modules/<feature>/
├── <feature>.module.ts      — registers controller + service, exports the service
├── <feature>.controller.ts  — @TenantModuleController wires feature-flag gating, permissions guards
├── <feature>.service.ts     — TenantContext-first method signatures
├── dto/                     — Data Transfer Objects for validation
├── entities/                — Drizzle table definitions owned by this module
├── jobs/                    — BullMQ processors, if needed
├── cron/                    — scheduled tasks
├── migrations/              — module-owned migration files (tenant schema)
└── feature.json             — { key, label, defaultEnabled: false }
```

### Core Rules for Extendability
1. **Never read `process.env` directly:** All env access lives in `apps/api/src/core/config/`.
2. **Shared Master Data:** Shared keys and configurations belong in `@boilerplate/contracts`.
3. **Module Isolation:** A module only touches its own tables in `entities/`. Cross-feature data access must go through the other module's exported service.
4. **Module Migrations:** Each module declares its own migrations in its `migrations/` folder.
5. **Feature Flags:** Modules are toggleable. Routes are gated using `feature.json`'s key and `@RequireFeature()`.

## How to Build a New Module

You can easily generate a new feature module using the provided CLI tools.

### 1. Generate the Base Module
To generate a basic NestJS module structure:
```bash
node scripts/generators/generate-module.js --name=<feature_name>
```

### 2. Generate a CRUD Module (Recommended for Standard Data)
If you are building a standard CRUD entity with API endpoints and a web page, use the CRUD generator:
```bash
pnpm generate:crud --model=product --fields=name:string,price:number,active:boolean
```
This creates:
- The backend module in `apps/api/src/modules/products/`
- The frontend module in `apps/web/src/modules/products/`
- Automatic registrations in `app.module.ts` and `module-loader.ts`

### 3. Generate Entities
To add new data entities to an existing module:
```bash
node scripts/generators/generate-entity.js --module=<feature_name> --name=<entity_name>
```

## How to Extend a Module

1. **Add Custom Fields:** 
   The boilerplate supports adding tenant-specific custom fields without migrations via a `<table>_custom_fields` definitions table and a `custom_fields` jsonb column on the data table. (See the [Employees](./employees.md) module for a reference implementation).

2. **Add Background Jobs:**
   To add background processing, create jobs in the module's `jobs/` directory. Remember to register the consumer processor in `apps/api/src/worker.module.ts` (the headless worker process), NOT in the API module itself. 

3. **Advanced Queries (List Endpoints):**
   Extend the `ListQueryConfig` in your module's service to define which columns are filterable, sortable, and searchable. Use the `listAndCount()` helper in `withTenantDb()` to handle search, filter, sort, and pagination.

## Existing Modules

The boilerplate comes with several built-in modules that serve both as functional features and reference implementations:

- [BPQL](./bpql.md)
- [Departments](./departments.md)
- [Documents](./documents.md)
- [Employees](./employees.md)
- [Notes](./notes.md)
- [Tasks](./tasks.md)
