# Departments Module

The **Departments** module is a standard CRUD feature for managing organizational departments within a tenant.

## Overview
Departments are typically used to group [Employees](./employees.md) and assign hierarchical or structural organization within a tenant's workspace.

## Key Features
- **Standard CRUD:** Full API and Web implementation for creating, reading, updating, and deleting departments.
- **Relational Integration:** Serves as a foreign key target for the Employees module (e.g., `departmentId`).

## Architecture
- `departments.module.ts`: Wires the `DepartmentsController` and `DepartmentsService`.
- **List Queries:** The `DepartmentsService` utilizes `ListQueryConfig` to support filtering by department name, status, etc., via the `listAndCount()` helper.

## Extension
When extending `Departments`, ensure that any new relational constraints (e.g., adding sub-departments or linking to tasks) are handled via proper service exports rather than direct entity imports by other modules.
