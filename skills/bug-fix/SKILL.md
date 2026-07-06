---
name: bug-fix
description: The standard engineering process for reproducing, fixing, and verifying bugs.
---

# Skill: Bug-Fix Engineering

This skill enforces a rigorous, evidence-based approach to fixing bugs, ensuring that fixes are verified and root causes are documented.

## When to use

Activate this skill whenever a user reports a bug, error, UI glitch, or unexpected behavior in the application.

## The Process

You **MUST** follow these steps in order. Do not skip steps.

### 1. Reproduce Bug
- Understand the steps to reproduce the bug.
- If the user hasn't provided reproduction steps, ask for them. 
- Attempt to reproduce the issue locally (using tests, CLI scripts, or interacting with the app if possible).

### 2. Inspect Logs
- Review the application logs, terminal output, or browser console errors to identify exactly where the failure occurs.
- If logs are insufficient, add temporary debug logging and reproduce again.

### 3. Patch Code
- Implement the fix in the codebase.
- Ensure the fix addresses the root cause, not just the symptom.

### 4. Run Lint and Tests
- Run the linting process (`pnpm lint:fix` or `pnpm lint`) to ensure the codebase conforms to all style and quality rules. Linting must pass before proceeding.
- Run existing unit/e2e tests to ensure your patch doesn't break other functionality.
- Write a new regression test that specifically targets the bug you just fixed so it doesn't happen again.

### 5. Verify Fix
- Run the build (`pnpm build`) and manually or automatically verify that the specific bug is resolved.

### 6. Document Root Cause
- Provide a summary to the user detailing the root cause of the bug, why it occurred, and how your patch resolves it.
- If the bug requires a change to the `refactoring-plan.md` or general architectural documentation, update those files.
