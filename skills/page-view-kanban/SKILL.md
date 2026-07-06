---
name: page-view-kanban
description: Use when designing task, issue, pipeline, workflow, sprint, approval, or CRM board pages. Provides Jira-style kanban and list-view patterns with compact filters, cards, activity, comments, assignees, watchers, and custom fields.
---

# Page View: Kanban

Use this for work moving through statuses.

## Layout

- Header: project/context switcher, count summary, board/list toggle, primary create action.
- Filters: one compact wrapping toolbar with search, status/type/priority, assignee, watcher, label, and clear.
- Board: horizontal status columns with fixed min widths and scroll on small screens.
- Card: key, summary, type, priority cue, assignee, labels, due date if present.
- Detail: modal or side panel with description, people, custom fields, comments, and activity history.
- List view: same data in `AdvancedDataTable` for bulk scanning and export.

## Rules

- Do not put each filter on its own full-width row on desktop.
- Use project-specific work keys where applicable, e.g. `WS-000001`.
- Board cards must be compact; avoid paragraph-heavy cards.
- Movement controls should update only status and preserve all other task data.
- Comments and activity are append-only history, not editable card text.
- Keep settings for statuses/projects/custom fields near the board, but separated from task creation.

## Implementation

- Store workflow constants in typed arrays or contracts, not scattered literals.
- Keep key generation in the API/service layer.
- Keep drag/drop optional. If omitted, provide explicit status move controls.
- Use stable column/card dimensions so empty/loading states do not shift the board.
