---
name: page-view-cards
description: Use when designing card-based views such as notes, knowledge snippets, templates, media, saved items, lightweight records, or Google Keep-style boards. Provides simple, elegant card-grid/list patterns.
---

# Page View: Cards

Use this when each item is more useful as a small object than a table row.

## Layout

- Header: title, one-line context, view toggle, primary create action.
- Controls: rounded search plus compact segmented status filters.
- Composer: inline quick-create when creation is frequent; modal only for richer creation.
- Content: responsive masonry-like grid or single-column list.
- Empty state: quiet, compact, with one primary action.

## Rules

- Keep the page flat; avoid heavy nested cards around the whole view.
- Cards should have one primary click target and a small icon toolbar.
- Use color sparingly for category or state, not decoration.
- Pin/archive/trash/reminder/label actions belong on card toolbars.
- Truncated text must preserve enough content to scan.
- Keep card controls hidden only if keyboard/focus accessibility remains clear.

## Implementation

- Use stable card min widths and min heights.
- Keep local-only UI metadata explicit; persist it when it becomes product data.
- Use icon buttons with `title`/accessible labels.
- Use list view for accessibility and dense scanning.
