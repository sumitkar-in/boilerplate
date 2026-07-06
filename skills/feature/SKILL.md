---
name: feature
description: The standard engineering process for implementing a new feature in this boilerplate.
---

# Skill: Feature Engineering

This skill enforces a strict, iterative workflow when implementing new features. It ensures that code generation, testing, building, and documentation are all completed systematically.

## When to use

Activate this skill whenever a user requests to build or add a new feature, module, or major capability to the boilerplate.

## The Process

You **MUST** follow these steps in order. Do not skip steps.

### 1. Read Requirement
- Thoroughly analyze the user's feature request.
- Ask clarifying questions if requirements are ambiguous.
- If necessary, confirm the database schema using the `db-schema-and-query-optimization` skill.

### 2. Generate Module
- Use the built-in CLI generators (e.g., `pnpm generate:crud` or `pnpm generate:module`) to scaffold the base backend and frontend code.
- Write the specific business logic, services, and UI components required by the feature.

### 3. Add Tests
- Write or update unit tests for your backend services.
- If applicable, write k6 performance/load tests or Playwright UI tests for the new module.

### 4. Run Lint and Build
- Run the linting process (`pnpm lint:fix` or `pnpm lint`) to ensure the codebase conforms to all style and quality rules. Linting must pass before proceeding.
- Run the build process (e.g., `pnpm build`, `pnpm --filter api build`, `pnpm --filter web build`) to ensure there are no compilation or type errors.

### 5. Fix Errors
- If the linting, build, or tests fail, inspect the output, patch the code, and return to Step 3. Iterate until the linting is clean, build succeeds, and all tests pass.

### 6. Update Docs
- Add a new module document in `docs/modules/` describing the feature's architecture, endpoints, and extension points.
- Update `docs/modules/index.md` if a new module was created.

### 7. Final Summary
- Create a `walkthrough.md` artifact (if in Planning Mode) or provide a detailed chat summary of the work completed, highlighting how the feature was implemented and any decisions made.
