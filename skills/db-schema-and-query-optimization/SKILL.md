---
name: db-schema-and-query-optimization
description: Enforces confirming database schema design and query optimization details before implementation.
---

# Skill: DB Schema & Query Optimization

This skill ensures that database schema changes and complex query implementations are thoroughly reviewed, optimized, and explicitly confirmed by the user before code is written. 

## When to use

Activate this skill whenever a task involves:
1. Creating or modifying database tables, columns, or relations.
2. Writing complex SQL queries or Drizzle ORM queries (joins, aggregations, large list queries).
3. Addressing performance bottlenecks related to database access.

## Workflow: Confirm Before Implementation

Before making any changes to `entities/*.ts` files, writing migrations, or implementing data-access logic in services, you **MUST** complete the following steps and request user approval:

### 1. Schema Verification
- **Avoid Duplication:** Check existing modules and entities to ensure the new schema doesn't duplicate existing data structures.
- **Relationships:** Clearly define Foreign Keys, standardizing on UUIDs. Verify whether cascade deletes are appropriate.
- **Tenant Isolation:** Ensure that tenant-scoped data is correctly placed within the architecture's tenant schema isolation boundaries (e.g., accessed via `TenantDbService`).
- **Indexes:** Identify columns used in `WHERE`, `JOIN`, or `ORDER BY` clauses and explicitly propose indexes for them. 

### 2. Query Optimization
- **N+1 Problem Prevention:** If the feature requires loading related data, explicitly state how you will avoid N+1 queries (e.g., using `db.select()...leftJoin()`, `inArray()`, or Drizzle's relational queries).
- **Pagination & Filtering:** For list endpoints, confirm the use of the boilerplate's `listAndCount()` pattern and `ListQueryConfig`. Do not hand-roll pagination unless absolutely necessary.
- **Specific Column Selection:** Propose selecting only the necessary columns rather than `select *` when joining large tables.

### 3. User Confirmation
- Create or update an `implementation_plan.md` artifact (or present the plan clearly in chat) detailing the proposed schema (Drizzle definitions) and the query strategy.
- Explicitly ask the user to confirm the schema, relationships, and indexes **before** you generate the migration or write the service code.

## Key Rules
- **DO NOT** execute Drizzle schema changes or write migrations without explicit user approval of the schema.
- **DO NOT** introduce cross-module entity imports. Module A's service must call Module B's service; it must not query Module B's entities directly.
