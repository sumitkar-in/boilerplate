---
name: page-view-settings
description: Use when designing settings, configuration, preferences, project setup, feature flags, roles, integrations, or admin configuration pages. Provides clear settings IA and form patterns.
---

# Page View: Settings

Use this for configuration that changes system behavior.

## Layout

- Header: setting area title and concise scope, e.g. tenant, project, or user.
- Navigation: left tabs/sidebar for 4+ sections; simple segmented tabs for 2-3 sections.
- Forms: grouped by decision, not database table.
- Save: section-level save for complex settings; inline save for small repeated items.
- Danger zone: visually separated and last.

## Rules

- Never mix unrelated settings in one long form.
- Make scope explicit: global, tenant, project, or user.
- Prefer select/toggle/checkbox controls over free text when values are constrained.
- Validate codes/slugs before save and show examples near the input.
- Changes that affect generated identifiers must explain the future-only behavior.
- Avoid modal-only settings for complex configuration; use a page or side panel.

## Implementation

- Store configurable/master data in API tables, seed files, typed constants, or schemas.
- Keep validation in DTO/schema files and repeat only user-friendly hints in UI.
- Use optimistic local list updates only after API success for critical config.
- Add tests for identifier/code formats and uniqueness.
