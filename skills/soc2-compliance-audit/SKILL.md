---
name: soc2-compliance-audit
description: SOC 2 security compliance readiness validation for software systems, repositories, APIs, infrastructure, and operational controls. Use when the user asks to validate security compliance, SOC 2 readiness, SOC 2 level security, compliance checks, audit evidence, Trust Services Criteria, or security control gaps.
---

# Skill: SOC 2 Compliance Audit

Use this skill to run a SOC 2 readiness-style security compliance validation. This is an engineering readiness check, not an auditor attestation or certification.

## Scope First

Before auditing, identify:
- System boundary: product, API, worker, database, infrastructure, CI/CD, and third-party services in scope.
- Report goal: readiness assessment, gap analysis, remediation plan, or evidence collection.
- Trust Services Criteria: always include Security; include Availability, Confidentiality, Processing Integrity, or Privacy only when relevant to the product or user request.
- Evidence source: code, configs, tests, logs, deployment manifests, policies, or user-provided artifacts.

If the scope is not explicit, proceed with the current repository and state assumptions.

## Required Workflow

1. Inventory the system
   - Identify apps, APIs, data stores, background jobs, auth boundaries, tenant boundaries, deployment files, and secrets/config paths.
   - Use `rg`, `rg --files`, package manifests, Docker/infra configs, and tests as primary evidence.

2. Run baseline technical checks where applicable
   - Dependency vulnerability check: `pnpm audit` or ecosystem equivalent.
   - Secret exposure check: search for likely credentials, tokens, private keys, hardcoded passwords, and unsafe defaults.
   - Authz/authn check: inspect login, session, JWT, MFA, RBAC, tenant isolation, and route guards.
   - Logging/audit check: inspect audit logs, request logs, redaction, error handling, and security-event coverage.
   - Data protection check: inspect encryption/TLS assumptions, password hashing, sensitive data storage, backup/restore hooks, and retention/deletion handling.
   - Change management check: inspect migrations, test coverage, CI/build scripts, feature flags, and deployment process.

3. Map findings to SOC 2 control areas
   - Use `references/soc2-control-map.md` for the control checklist.
   - Mark each area as `pass`, `partial`, `fail`, or `not assessed`.
   - Attach concrete file paths, commands, config keys, log excerpts, or missing-evidence notes.

4. Prioritize remediation
   - Lead with high-risk gaps that could block SOC 2 Security readiness: missing MFA option, weak password/session policy, missing tenant isolation, missing audit logs, unmanaged secrets, dependency CVEs, missing backups, or uncontrolled production changes.
   - Prefer small, testable implementation steps over policy-only recommendations.

5. Report clearly
   - State that this is not a SOC 2 certification.
   - Provide a table or bullets: control area, status, evidence, gap, remediation.
   - Include commands run and tests passed/failed.
   - Call out evidence that must come from outside the repo, such as HR onboarding, vendor reviews, incident-response exercises, access reviews, and production backup restore tests.

## Output Standard

Use this order:

1. Executive summary: readiness level and top risks.
2. Findings: ordered by severity, each with evidence and remediation.
3. SOC 2 mapping: concise status by control area.
4. Verification: commands run and remaining evidence gaps.
5. Next actions: concrete implementation or policy tasks.

Do not claim compliance, certification, or audit pass unless a licensed independent auditor report is provided. Use "readiness", "coverage", or "control evidence" instead.
