# SOC 2 Audit Report

This document serves as the technical security baseline and audit report for SOC 2 (Security and Confidentiality Trust Services Criteria) for this application. It reflects the implementation of security controls designed to protect customer data and ensure system integrity.

## Scope

- API: `apps/api`
- Web client: `apps/web`
- Shared packages: `packages/*`
- Database schemas & migrations: `drizzle/*`, module migrations under `apps/api/src/modules/*/migrations`
- Deployment and CI: `infra/docker`, `.github/workflows`

## Technical Controls Implemented

### 1. Logical Access & Authentication (CC6.1)
- **Role-Based Access Control (RBAC):** `JwtAuthGuard`, `AuthContextMiddleware`, `PermissionsGuard`, and `RolesGuard` enforce access restrictions across the API.
- **Password Complexity:** Passwords are required to be a minimum of 8 characters and must contain at least one uppercase letter, one lowercase letter, one number, and one special character.
- **Brute-Force Protection:** `@nestjs/throttler` is enabled globally and specifically protects the `/auth/login` endpoints to mitigate credential stuffing.
- **Multi-Factor Authentication (MFA):** TOTP 2FA is supported and can be enforced at the tenant level for privileged environments.
- **Session Timeout:** The frontend client (`AppShell`) monitors inactivity (mouse, keyboard clicks) and enforces automatic session timeouts based on the `sessionTimeoutMinutes` configured in the tenant's security settings.

### 2. Tenant Isolation & Data Mitigation (CC6.6)
- **Schema-Based Isolation:** Customer data is strictly isolated using PostgreSQL schemas (`tenant_<slug>`), virtually eliminating cross-tenant data leaks.
- **Context Resolution:** Tenant context is resolved server-side from verified tokens and database membership.

### 3. Audit Logging (CC7.2)
- **Comprehensive Mutation Logging:** A global `AuditLogInterceptor` captures all state-mutating API requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Data Capture:** Logs capture tenant ID, user ID, requested action, and IP address.
- **Data Protection in Logs:** Sensitive PII and secrets (e.g., `password`, `token`, `refreshToken`) are automatically redacted from the request body before being committed to the `audit_logs` table via the `AuditLogService`.

### 4. Vulnerability Management (CC7.1)
- **Dependency Scanning:** CI requires passing `pnpm audit --audit-level high` with no known vulnerabilities. 
- **Security Headers:** API responses emit standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.).

## SOC 2 Control Mapping Summary

| Control Area | Status | Notes |
| :--- | :--- | :--- |
| **Logical Access (CC6.1)** | `Pass` | RBAC, MFA, complex passwords, login rate limits, and inactivity timeouts are active. |
| **System Operations (CC7.1)** | `Partial` | Structured logs are present. Needs formal on-call, alert thresholds, and incident response SLA documentation. |
| **Change Management (CC8.1)** | `Pass` | CI lint/build/test and database migrations (`drizzle`) are supported. |
| **Data Mitigation (CC6.6)** | `Pass` | Schema-based tenant isolation prevents data leakage. |
| **Audit Logging (CC7.2)** | `Pass` | Global mutation tracking is recorded with automated PII redaction. |
| **Confidentiality (CC6.1)** | `Partial` | Code-level controls pass. Requires validation of infrastructure-level encryption-at-rest (KMS). |
