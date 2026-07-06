# SOC 2 Control Map

Use this as the working checklist for readiness assessments. Map controls to concrete evidence in the repository or supplied artifacts.

## Security Common Criteria

### Control Environment
- Governance owns security policies, roles, accountability, and review cadence.
- Security responsibilities are assigned for engineering, operations, and administration.
- Hiring, onboarding, and termination processes include access control steps.

### Communication and Information
- Security policies and procedures are documented and available to staff.
- Customers and users receive security-relevant notifications where required.
- Internal security events are routed to responsible owners.

### Risk Assessment
- Threats and risks are identified for product, infrastructure, data, vendors, and tenants.
- Risk decisions are tracked with owners and mitigation dates.
- Fraud, abuse, and unauthorized access scenarios are considered.

### Monitoring Activities
- Logs, metrics, and alerts cover authentication, authorization, privileged actions, configuration changes, errors, and suspicious activity.
- Control failures are triaged and remediated.
- Vulnerability and dependency scans are recurring.

### Control Activities
- Secure development lifecycle includes code review, tests, CI checks, and controlled releases.
- Changes to production are authorized, reviewed, and traceable.
- Database migrations are idempotent, reviewed, and recoverable.

### Logical and Physical Access
- Authentication uses strong password storage and secure session/JWT handling.
- MFA exists for privileged users or can be enforced.
- Authorization is role-based and enforced server-side.
- Tenant isolation is enforced in every tenant-data access path.
- Privileged access is minimized, logged, and reviewed.
- Secrets are not committed and are managed through environment/secret stores.

### System Operations
- Production runtime has health checks, structured logs, redaction, and operational runbooks.
- Backups, restore procedures, and retention are documented and tested.
- Incidents have response, escalation, and postmortem workflows.

### Change Management
- Source changes are version controlled and peer reviewed.
- CI/build/test gates are defined.
- Feature flags and migrations cannot leave enabled features without required schema/data controls.
- Emergency changes are tracked after the fact.

### Risk Mitigation
- Vendor dependencies and third-party services are tracked.
- Security patches are triaged by severity.
- Disaster recovery and business continuity risks are assessed.

## Additional Trust Services Categories

### Availability
- Capacity, monitoring, alerting, and incident response exist.
- Backup and restore are tested.
- Dependency failure modes and degraded operation are documented.

### Confidentiality
- Confidential data is classified and access-restricted.
- Data is encrypted in transit and protected at rest where applicable.
- Export/download paths have authorization and audit evidence.

### Processing Integrity
- Input validation, transaction integrity, idempotency, and error handling prevent incomplete or incorrect processing.
- Background jobs have retry, deduplication, ownership, and status tracking.
- Reconciliation or audit trails exist for critical data changes.

### Privacy
- Personal data collection, use, retention, deletion, and disclosure match policy commitments.
- User data subject requests can be fulfilled where applicable.
- Privacy-impacting changes are reviewed.

## Severity Guide

- Critical: likely unauthorized access, tenant/data exposure, credential leakage, or missing production access control.
- High: missing key SOC 2 Security controls such as MFA for admins, audit trails, vulnerability management, or migration safety.
- Medium: partial evidence, weak operational procedures, missing tests, or incomplete monitoring.
- Low: documentation gaps, naming inconsistencies, or minor hardening improvements.
