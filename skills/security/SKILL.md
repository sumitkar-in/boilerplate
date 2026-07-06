---
name: security
description: The standard engineering process for addressing security vulnerabilities and CVEs.
---

# Skill: Security Engineering

This skill ensures a systematic and safe approach to updating dependencies and resolving Common Vulnerabilities and Exposures (CVEs) in the boilerplate.

## When to use

Activate this skill when the user asks to perform a security audit, resolve dependabot alerts, patch CVEs, or update vulnerable npm packages.

For SOC 2, security compliance readiness, Trust Services Criteria, or compliance validation requests, use `skills/soc2-compliance-audit/SKILL.md` instead of this CVE-focused workflow.

## The Process

You **MUST** follow these steps in order. Do not skip steps.

### 1. Scan Dependencies
- Run `pnpm audit` or equivalent commands to scan the repository for vulnerable packages.
- Identify the affected packages and the severity of the vulnerabilities.

### 2. Find CVEs
- Review the specific CVEs associated with the vulnerable packages.
- Determine the required version bump (patch, minor, or major) to resolve the CVE.

### 3. Update Packages
- Update the affected packages to the secure versions (e.g., using `pnpm update <package>` or modifying `package.json`).
- Ensure the lockfile (`pnpm-lock.yaml`) is correctly updated by running `pnpm install`.

### 4. Run Lint and Regression Tests
- Security updates can introduce breaking changes. You **MUST** run the full lint and test suite (`pnpm lint`, `pnpm test`, `pnpm build`) to ensure nothing was broken by the update. Linting must pass before proceeding.
- Fix any compilation or type errors that arise from the dependency bump.

### 5. Create Report
- Summarize the actions taken. List the packages updated, the CVEs patched, and the results of the regression tests. 
- Present this report to the user as confirmation of a secure state.
