---
name: page-view-table-list
description: Use when designing or refactoring table, list, CRUD, directory, audit-log, or master-data pages. Provides simple, elegant patterns for dense operational views with filters, bulk actions, exports, and row actions.
---

# Page View: Table And List

Use this for operational data pages where users scan, compare, filter, edit, export, or act on many records.

## Layout

- Header: title, one-line context, primary action, optional secondary import/export.
- Toolbar: compact search, 2-5 high-value filters, saved view control if useful.
- Content: `AdvancedDataTable` by default. Use list rows only when each item needs richer text than columns can carry.
- Details: open row details in a modal or side panel; do not navigate away for quick edits.
- Empty state: one short sentence plus one action.

## Rules

- Keep filters in one wrapping toolbar; never stack full-width filters on desktop.
- Use `boilerplate-view-toolbar` only when the page actually has a table.
- Put business status, type, and priority in compact badges.
- Keep row actions icon-first and grouped at the right.
- Search and every filter control (status, type, department, date range, etc.) must call the backend API with the filter as a query param — never filter an already-fetched array in the browser. This includes `AdvancedDataTable`'s own per-column filter dropdowns: they must be driven by server data (fetch the distinct values and re-query), not by slicing the loaded `data` array. Client-side filtering is only acceptable for a genuinely local, non-paginated list (e.g. a fixed set of &lt;20 items with no backing endpoint).
- Debounce search input (~250ms) before firing the request; reset to page 0 on any filter change.
- Export the visible dataset when the table supports it.

## Implementation

- Use `AdvancedDataTable` from `@boilerplate/ui-common`.
- Keep page files thin: data hook, columns builder, modal/form components.
- Use `useTranslation()` for all labels.
- Use `lucide-react` icons; no emojis.
- Add stable widths for action columns, badges, and compact controls.

## Inline cell editing

Reference implementation: `apps/web/src/modules/departments/pages/DepartmentPage.tsx` and
`apps/web/src/modules/employees/pages/EmployeePage.tsx` (+ `employees/components/useEmployeeColumns.tsx`).
Every table that supports quick edits must follow this exact shape — do not invent a per-page variant:

- Mark editable columns with `editable: true` (and `editable: someCondition` when it depends on data, e.g. only editable once a related list is non-empty) plus `editType` (`text` / `textarea` / `number` / `tel` / `email` / `date` / `select`) on the `AdvancedTableColumn`.
- For `select` edit types, provide `editOptions` and a `getEditValue` that returns the raw id/value (separate from `getValue`, which renders the display label).
- Wire a single `onCellEdit={(row, column, value) => ...}` prop on `AdvancedDataTable` that calls the module's update API (or a `saveCell` helper on the data hook) and reloads/patches state, matching the pattern in `DepartmentPage.tsx`'s `onCellEdit` and `useEmployeesData`'s `saveCell`.
- Keep the full-form modal (`*FormModal`) for creating a row and for editing fields that aren't safely inline-editable (e.g. multi-field validation); inline edit and the modal both call the same update API.
- Non-editable columns (e.g. `createdAt`) simply omit `editable`.
