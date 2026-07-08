# Boilerplate Analysis — Feature Roadmap & Issue-Fix Plan

## Context

Full-codebase audit (July 2026) of this multi-tenant modular SaaS boilerplate (pnpm monorepo: NestJS API + BullMQ worker, schema-per-tenant Postgres/Drizzle, React web micro-frontend host, Expo mobile, Python AI service). This document covers: (1) functionalities worth adding to make it a stronger starter boilerplate, and (2) all issues found, with a phased fix plan. **Planning document only — nothing here is implemented yet.**

Codebase state: already strong. 9 backend modules (employees, departments, notes, tasks, documents, calendar, bpql, notifications, knowledge-bot), auth with 2FA/invites/impersonation, opaque hashed refresh tokens, RBAC, feature flags (Redis-backed), audit logging, S3/local storage, Prometheus/Loki/Grafana, k6, 7 code generators, 30 API unit specs + 8 e2e specs, CI with CodeQL/Sonar/Trivy.

---

## Part A — Functionalities to add (starter-boilerplate roadmap)

### Tier 1: Baseline SaaS expectations (highest value, currently missing)

1. **Email subsystem (core mail module)** — `nodemailer` exists but only inside `apps/api/src/modules/notifications/jobs/notifications.processor.ts`. Build `apps/api/src/core/mail/` with a pluggable driver (SMTP / SES / console-dev), templated emails (mjml or simple handlebars), sent via BullMQ. Add SMTP vars to `.env.example` + `env.validation.ts`. This unblocks 2–4 below.
2. **Password reset flow** — forgot-password endpoint (token table, hashed, TTL), reset endpoint, web pages. Reuse the invite-token pattern in `core/auth/invites.service.ts`.
3. **Email verification** — verify-on-signup / on-invite-accept; gate configurable per tenant.
4. **Invite email delivery** — invites currently generate tokens with no delivery mechanism; wire into the mail module.
5. **Billing module (Stripe)** — subscription plans per tenant, seat counting, webhook handler, customer portal link, plan → feature-flag mapping (plans grant module keys). Feature-flagged module so template users can delete it cleanly.
6. **Health/readiness endpoints** — `@nestjs/terminus`: `/healthz` (liveness) + `/readyz` (DB + Redis checks); wire into compose healthchecks and k8s-style probes.
7. **Frontend test infrastructure** — vitest + React Testing Library in `apps/web`, MSW for API mocking, example specs for the reference `employees` module (data hook, table page, modal), CI step. Same-shape minimal setup for mobile (jest-expo).

### Tier 2: Strong differentiators for a starter template

8. **OAuth / SSO** — Google/GitHub social login; optional SAML/OIDC per tenant (enterprise SSO). Extends `core/auth`.
9. **In-app notifications UI** — notifications module is backend-only (queue/cron). Add web frontend module: bell icon, unread count (poll or SSE), preferences page; mirror to mobile later.
10. **Per-module RBAC permissions** — replace the single generic `modules:read|create|update|delete` set with `employees:read`, `notes:write`, etc. (see Issue #2 — this is both a gap and a feature).
11. **API keys / machine-to-machine auth** — per-tenant scoped API keys (hashed, prefixed, revocable) for integrations; guard alongside JWT.
12. **Outbound webhooks (first-class)** — `notifications.service.ts` has `sendWebhook`; promote to a proper module: endpoint registry per tenant, event subscriptions, HMAC signing, retry with backoff, delivery log UI.
13. **User profile & account settings** — avatar upload (storage module exists), name/locale/timezone, change password, active sessions list with revoke (refresh tokens are already DB-tracked — just expose them).
14. **Data export / GDPR tooling** — per-tenant full export (reuse CSV worker pattern), account deletion flow, retention policy hooks. Pairs with the existing soc2-audit docs.
15. **i18n locales** — infra supports it but only `en.ts` ships; add one more locale (e.g. `es`/`de`) as the working example + a locale switcher.
16. **Onboarding/signup flow** — currently tenants are created by super-admin only. Optional self-serve signup: create tenant + first admin user + provisioning, behind a config flag.

### Tier 3: Nice-to-have / ecosystem

17. **Realtime layer** — WebSocket/SSE gateway (Nest `@nestjs/websockets` + Redis pub/sub) powering notifications, task board live updates, document presence.
18. **Full-text search** — Postgres `tsvector` service in core + example wiring in documents/notes.
19. **Mobile parity** — port tasks/documents/calendar modules, add 2FA to LoginScreen, mobile generator template (`generate:mobile-module`).
20. **Admin analytics dashboard** — tenant usage metrics (rows, storage, active users) on the super-admin shell, backed by existing Prometheus data.
21. **CLI polish for template consumers** — flesh out `scripts/create-boilerplate.js`: interactive module selection (delete unwanted modules), CI provider choice, license/name substitution.
22. **Deployment recipes** — `infra/` additions: production compose file, k8s manifests or Helm chart, Terraform example, deploy docs.
23. **E2E browser tests** — Playwright smoke suite (login → CRUD on employees → logout) in CI.
24. **Backup/restore tooling** — pg_dump per-tenant-schema script + restore runbook.

---

## Part B — Issues found & fix plan

### Critical/High

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| 1 | Rate limiting only on tenant `POST /auth/login`; super-admin login, 2FA verify, refresh, invite-accept are brute-forceable | `apps/api/src/core/auth/auth.controller.ts:53,72,82,94,245`; throttler not an `APP_GUARD` (`app.module.ts:122-129`) | Register `ThrottlerGuard` as `APP_GUARD` with sane defaults + `@SkipThrottle()` where needed, or add per-route `@Throttle` to all five auth endpoints. Add e2e asserting 429 |
| 2 | No email verification / password reset (no mail subsystem) | grep: no mailer/forgot-password anywhere in `apps/api/src` | Tier 1 items 1–4 above |
| 3 | Zero frontend tests (web + mobile), none in CI | `apps/web`, `apps/mobile`, `.github/workflows/ci.yml:29-34` | Tier 1 item 7 |

### Medium

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| 4 | Coarse RBAC: one `modules:*` permission set gates every feature module — can't grant Notes-only access | all module controllers, e.g. `employees.controller.ts:37`, `notes.controller.ts:17`; `core/rbac/permissions.ts` | Namespaced per-module permissions; migration to expand existing role grants; update generators to emit the namespaced form |
| 5 | API has no graceful shutdown (worker does) — DB/Redis `onModuleDestroy` never runs on SIGTERM | `apps/api/src/main.ts` (missing `app.enableShutdownHooks()`; present in `worker.main.ts:18`) | One-line fix + brief manual verify |
| 6 | docker-compose: `api`/`worker` `depends_on` postgres/redis with no healthchecks/`service_healthy` conditions | `infra/docker/docker-compose.yml:92-94,130-132` | Add pg_isready/redis-cli healthchecks + `condition: service_healthy`; add api healthcheck once `/healthz` exists (Tier 1 item 6) |
| 7 | Web modules re-declare all domain types locally (Employee, Note, Task, DocSpace…) instead of sharing via `@boilerplate/contracts` — silent drift from API DTOs | `apps/web/src/modules/*/api/index.ts` (systemic, incl. reference employees module) | Move domain shapes into `packages/contracts/src/api-types.ts` (or per-module contract files); update web imports; update `generate:crud`/`generate:frontend-module` templates so new modules follow suit |
| 8 | Tasks page filters/sorts the full fetched array client-side, violating the server-side-only rule; calendar partially too | `apps/web/src/modules/tasks/pages/TasksPage.tsx:306` (+ sorts at 232/263), `calendar/components/CalendarMonthView.tsx:42` | Refactor tasks to `ListQueryDto` + server-side hook per the employees reference (`useEmployeesData.ts`); calendar month-view local grouping is acceptable, but fetch should be range-scoped |

### Low

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| 9 | `sql.raw` interpolation of field keys in BPQL aggregation — safe today (regex + assertKnownFields) but the only parameterization bypass | `apps/api/src/modules/bpql/bpql.service.ts:563,589` | Add a guard comment + unit test pinning the key regex; or switch to identifier-safe helper |
| 10 | Root endpoint is a static hello; no dependency-aware health probe | `apps/api/src/app.controller.ts:13` | Covered by Tier 1 item 6 |
| 11 | Weak default creds in `.env.example` (admin123/viewer123/minioadmin) with no production warning; hardcoded seed password | `.env.example:44-63`, `scripts/seed-bpql-dummy.ts:13` | Add loud "change for any exposed deployment" comments; read seed password from env with fallback |
| 12 | compose hardcodes `DATABASE_URL` instead of `${DATABASE_URL}` — `.env` value silently ignored in containers | `docker-compose.yml:69,107` | Substitute env vars |
| 13 | 28 components exceed the 150-line rule (TasksPage 466, DocumentsPage 430, TaskDetailPage 409, MenuOrderPage 405, AppShell 352…) | `apps/web/src/**` | Split worst offenders during the tasks refactor (#8); don't boil the ocean — fix top ~6 |
| 14 | ~20 module components lack `useTranslation` (hardcoded strings) | e.g. `tasks/components/TaskModal.tsx`, `documents/components/DocumentEditor.tsx`, `knowledge-bot/components/KnowledgeSourcesPanel.tsx` | Sweep: move strings to `core/i18n/locales/en.ts` |
| 15 | Generator scaffold `init-repo-structure.js` writes TODO-stub scripts ("not yet implemented") into fresh projects | `scripts/generators/init-repo-structure.js:270-373` | Verify whether this path is still used by `create-boilerplate.js`; either wire to the real scripts or delete |
| 16 | Committed dev artifacts (Playwright screenshots, `out6.txt`/`out7.txt`) | `scripts/debug/` | Delete + gitignore |
| 17 | knowledge-bot `feature.json` missing `defaultEnabled` (inconsistent with siblings) | `apps/api/src/modules/knowledge-bot/feature.json` | Add the field |

---

## Part C — Execution phases (when implementation is approved)

Each phase ends with the quality gate: `pnpm lint && pnpm build && pnpm --filter api test` (+ e2e where touched).

- **Phase 1 — Security & ops hardening (small, high-impact):** Issues #1, #5, #6, #9, #11, #12, #16, #17 + `/healthz`/`/readyz` (terminus). ~1 focused PR series.
- **Phase 2 — Email subsystem:** core mail module → invite delivery → password reset → email verification (Tier 1 items 1–4, fixes Issue #2).
- **Phase 3 — Frontend testing:** vitest + RTL + MSW, employees example specs, CI step; jest-expo skeleton for mobile (Issue #3).
- **Phase 4 — Consistency refactors:** per-module RBAC (#4), shared contract types (#7), tasks server-side filtering (#8), component splits (#13), i18n sweep (#14), generator template updates so new code follows the fixed patterns.
- **Phase 5 — Feature roadmap:** pick from Tier 2/3 by priority — suggested order: notifications UI (9) → user profile/sessions (13) → OAuth (8) → billing (5) → API keys (11) → webhooks module (12) → self-serve signup (16).

Generator-first rule applies throughout: any new module/entity/page/cron/k6/dashboard goes through `pnpm generate:*` with a confirmed spec, then customization.

## Verification (per phase)

- Phase 1: e2e specs asserting 429 on all auth endpoints; `docker compose up` cold-start ordering; `kill -TERM` API and confirm clean pool shutdown in logs; curl `/readyz` with Redis stopped → 503.
- Phase 2: mailhog/console driver in dev; e2e for reset/verify token flows (expiry, single-use, hashing).
- Phase 3: `pnpm --filter web test` green locally and in CI.
- Phase 4: existing API e2e suite (esp. `tenant-isolation`, `feature-flag-regression`) still green; manual pass over tasks page pagination/filtering against seeded data.
