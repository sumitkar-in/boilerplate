---
name: page-view-document-editor
description: Use when designing internal docs, wiki, Confluence-like spaces, rich-text/markdown editors, knowledge bases, changelogs, policy pages, comments, and revision history.
---

# Page View: Document Editor

Use this for long-form internal knowledge and collaborative documents.

## Layout

- Shell: spaces/sidebar on the left, page tree or page list next, editor/reader main area.
- Header: breadcrumbs, title, status, save/publish controls, more menu.
- Editor: mode switch for rich text and markdown when both are supported.
- Right rail: comments, page metadata, history, or outline.
- History: revision list with timestamp, author, and restore/view action.

## Rules

- Reading and editing states should be visually distinct.
- Keep markdown raw text and rendered rich text from overwriting each other accidentally.
- Comments must anchor to page or selection scope clearly.
- Autosave needs visible saved/error state; manual save needs disabled/loading states.
- Backups/revisions are append-only; never replace history in place.
- Avoid marketing-style hero layouts for internal docs.

## Implementation

- Keep content format, body, rendered preview, comments, and revisions as separate concerns.
- Store space/page slugs in validated fields.
- Use debounced saves only when the API supports conflict handling.
- Add import/export hooks later; do not bake them into the editor component.
