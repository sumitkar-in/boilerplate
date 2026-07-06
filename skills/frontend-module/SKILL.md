# Skill: Frontend Module Shape (Micro-Frontend)

## What

Every frontend feature lives in `apps/web/src/modules/<feature>/` (and, if it ships on mobile, `apps/mobile/src/modules/<feature>/`) with the same `module.config.ts` shape — `routes.tsx`/`pages/` on web, `navigation.tsx`/`screens/` on mobile, plus `components/`, `api/`, `store/` on each.

`module.config.ts` imports `ModuleConfig` from `@boilerplate/contracts`. Do not redeclare that type locally; the shared contract keeps web/mobile loaders and generated modules aligned.

The shell (`apps/<platform>/src/core/module-loader.ts`) lazy-loads a module's routes/navigation via dynamic `import()`, gated by the tenant's enabled feature keys — a tenant without the feature never even triggers the `import()`, not just hides the UI behind a check.

Mobile deliberately uses plain `@react-navigation` rather than Expo Router: this registry pattern mirrors the web shell's manual `react-router-dom` setup, so the generator and feature-flag gating logic stay identical on both platforms (architecture doc §11.4).

## When to use

Any feature that needs a UI. Run after (or alongside) the matching backend module — a frontend module with no backend module behind it will call a route that 403s.

## Minimal example

```bash
node scripts/generators/generate-module.js --name=billing                       # backend
node scripts/generators/generate-frontend-module.js --name=billing              # web + mobile
node scripts/generators/generate-frontend-module.js --name=billing --platform=web   # web only
```

The frontend generator writes the folder shape and registers the module in the matching `module-loader.ts` — look for the `// new modules are appended below this line` marker if you need to hand-edit.

## Building data-table pages

Use the shared pieces before writing anything new — the employees module
(`apps/web/src/modules/employees/`) is the reference:

- **`AdvancedDataTable`** (`@boilerplate/ui-common`): excel-style per-column
  filters + sort, dynamic filter rows, global quick search (uncontrolled =
  client-side; pass `searchValue`/`onSearchChange` to drive a server-side
  search), inline cell editing (`editable`, `editType` incl. `select` with
  `editOptions`/`getEditValue`), CSV export of the visible rows
  (`exportFileName`), and a server-side `pagination` footer.
- **Page composition**: a thin `pages/<X>Page.tsx` orchestrating a
  `hooks/use<X>Data.ts` (fetching + mutations + toasts), a
  `components/use<X>Columns.tsx` column builder, and small modal components
  (`<X>FormModal`, column manager). Keeps every file under the 150-line rule.
- **Cross-module data** (e.g. the employees page's department dropdown):
  call the other module's `api/` helpers and gate the fetch with
  `useFeatureFlag('<key>')` — never import its components or store.
- **Async CSV import/export** goes through the worker queue endpoints, not
  the browser (see `EmployeeCsvActions` and skills/crud-module/SKILL.md).

## Choosing a page-view skill

Before designing a module page, use the narrowest page-view skill that matches
the user's workflow:

- `skills/page-view-table-list/SKILL.md`: CRUD, directories, master data, audit logs.
- `skills/page-view-kanban/SKILL.md`: tasks, issues, workflow boards, pipelines.
- `skills/page-view-cards/SKILL.md`: notes, snippets, templates, saved items.
- `skills/page-view-dashboard/SKILL.md`: KPIs, reports, overview pages.
- `skills/page-view-settings/SKILL.md`: tenant/project/user configuration.
- `skills/page-view-document-editor/SKILL.md`: docs, wiki, rich text, markdown.

## Rules that keep this useful instead of becoming clutter

1. **A component goes in `ui-common` only once a second module needs it**, and only on web — React Native can't render DOM components, so `ui-common`'s `components/` folder is web-only. `hooks/` and `theme/` are shared by both.
2. **`ui-common` has no feature-specific logic.** An `<InvoiceRow>` belongs in `modules/billing/components/`, not `ui-common`.
3. **Shared constants/types come from `@boilerplate/contracts`.** Use it for `ModuleConfig`, `TenantRole`, `ListResponse`, storage keys, and session/API types instead of copying frontend-only aliases.
4. **No module imports another module's `components/` or `store/` directly.** Same boundary rule as the backend (skills/nestjs-module/SKILL.md).
5. **Localization (i18n)**: All UI texts MUST use `useTranslation()` from `react-i18next`.
6. **Standard Icons**: Do not use emojis in UI elements. Use standard icon libraries like `lucide-react`.
7. **Reusable Components (< 150 lines)**: Always use reusable components. Avoid exceeding 150 lines of code per component or page file by breaking sections into smaller files.

## Common mistakes

- **Importing a `ui-common` visual component from mobile code.** `ui-common/src/components/` is web-only by design (DOM vs. native render targets) — mobile only imports `hooks/` and `theme/` from it.
- **Building the web module's UI before the backend module exists.** The generated `api/` stub talks to `apps/api/src/modules/<feature>/<feature>.controller.ts` — if that module doesn't exist yet, every request 403s (no route) rather than just being empty data.
- **Forgetting `navigation.tsx` must be `.tsx`, not `.ts`.** It renders JSX (the `<Stack.Navigator>` tree), so the file extension matters for the TypeScript compiler even though the architecture doc's tree diagram shows it as `navigation.ts` for brevity.
- **Wiring a module's `routes.tsx`/`navigation.tsx` into the app shell by hand.** That's `module-loader.ts`'s job — it reads `enabledFeatureKeys` and decides what to lazy-load; don't import a feature module's `routes.tsx` directly from `App.tsx`/shell code.
- **Hardcoding the mobile API URL.** Mobile reads `EXPO_PUBLIC_API_URL`; leave emulator/LAN/tunnel choices in env, not source.
