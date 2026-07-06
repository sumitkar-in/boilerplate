# Employees Module

The **Employees** module is the primary reference implementation for advanced CRUD operations, custom fields, and asynchronous background processing in the boilerplate.

## Overview
It manages employee records for a tenant and demonstrates how to build highly extendable data models that tenants can customize on the fly.

## Key Features

### 1. Custom Fields (User-Defined Columns)
The Employees module serves as the reference for letting tenants add their own fields from the UI without requiring a database migration:
- Uses an `employees_custom_fields` definitions table (stores `field_key`, `label`, `type`, `options`).
- Uses a `custom_fields` jsonb column on the main employees table.
- The `EmployeesService` automatically sanitizes incoming values and merges updates safely (`||` jsonb operator).
- Fully supports filtering and sorting on custom fields via `custom:<fieldKey>`.

### 2. Async CSV Export/Import
Demonstrates offloading heavy tasks to a background worker:
- **API:** `POST /employees/export` and `POST /employees/import` enqueue BullMQ jobs.
- **Worker:** The `employee-csv.processor.ts` consumes jobs in the headless worker process (registered in `worker.module.ts`).
- **Frontend:** Polling is handled gracefully via UI actions (`waitForEmployeeCsvJob`).

### 3. List Endpoints
Utilizes the `ListQueryConfig` to provide powerful search, filtering, and pagination out of the box, integrating directly with the frontend `AdvancedDataTable`.
