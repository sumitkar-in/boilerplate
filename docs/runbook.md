# Operational Runbook & Playbook

This runbook serves as the primary standard operating procedure (SOP) for managing, deploying, and troubleshooting the boilerplate application. 

---

## 1. Daily Operations & Playbooks

### 1.1 Generating New Features
When a new requirement is approved, use the scaffold generators to ensure architecture consistency rather than copying/pasting files.

**Playbook:**
1. Generate the backend module: `pnpm generate:module --name=orders`
2. Generate the entity (if DB changes are needed): `pnpm generate:entity --name=order`
3. Generate CRUD endpoints: `pnpm generate:crud --name=orders`
4. Generate the frontend scaffolding: `pnpm generate:frontend-module --name=orders --platform=web`

### 1.2 Releasing a New Version
The platform relies on a synchronized release script to bump versions across web, mobile, and API, as well as busting the web service worker cache.

**Playbook:**
1. Check that everything passes CI locally: `pnpm release:check`
2. Dry-run the version bump to ensure no conflicts: `pnpm release:version patch --dry-run`
3. Execute the version bump: `pnpm release:version patch` (or `minor`, `major`, or an explicit version like `1.2.3`).
4. Commit the changes and push to trigger CI/CD.

### 1.3 Managing Tenants
Because this is a multi-tenant application, tenants are isolated via row-level security or explicit schema/data segregations.

**Playbook:**
- **Create a tenant:** `pnpm tenant:create --slug=acme --features=all`
- **Impersonate a tenant:** Super admins can log into `https://localhost/admin/tenants` and use the "Impersonate" action to view the app as a specific tenant.

---

## 2. Database Management

The database uses PostgreSQL. Migrations are split into core (global platform tables) and tenant (tables isolated per tenant).

### 2.1 Applying Migrations
Always run core migrations before tenant migrations.
```bash
pnpm migrate:core
pnpm migrate:tenants
```

### 2.2 Complete Database Reset (Local/Dev Only)
If your schema gets corrupted locally, you can wipe and reconstruct it.
> [!CAUTION]
> NEVER run this in production. This drops all schemas.

```bash
pnpm db:fresh
```
This command chains `db:clean`, `migrate:core`, `migrate:tenants`, and `seed:super-admin`.

---

## 3. Incident Response & Troubleshooting

### Scenario A: API Returns 502 Bad Gateway
This means Nginx is up, but it cannot reach the API process on port 3000.

**Troubleshooting Steps:**
1. Verify the API is actually running. If you are in **Host Development Mode**, ensure `pnpm dev:api` is actively running in a terminal.
2. If in **Dockerized Mode**, check if the API container crashed:
   ```bash
   docker compose -f infra/docker/docker-compose.yml logs api
   ```
3. Common cause: A missing environment variable (like `JWT_SECRET`) or a database connection refusal.

### Scenario B: Background Jobs (Worker) Are Not Processing
The API might be successfully queuing jobs to Redis, but they aren't executing.

**Troubleshooting Steps:**
1. Ensure the worker process is running (`pnpm dev:worker`).
2. Verify the Redis connection. The worker depends on `REDIS_URL`.
3. Check the worker logs for `UnknownDependenciesException` (this occurs if a new Module is added to the API but wasn't imported into `worker.module.ts`).

### Scenario C: "Missing relation" or SQL Errors in API
This occurs when the database schema does not match the ORM definitions.

**Troubleshooting Steps:**
1. Check if there are pending migrations.
2. Run `pnpm migrate:core` and `pnpm migrate:tenants`.
3. If the error persists, check that the newly generated entity was properly exported and registered in the ORM schema file.

---

## 4. Observability & Monitoring

The boilerplate ships with a full Grafana, Prometheus, and Loki stack.

### 4.1 Accessing the Dashboards
- **URL:** [https://localhost/grafana](https://localhost/grafana)
- **Login:** Use the `INFRA_ADMIN_PASSWORD` defined in your `.env`.

### 4.2 Querying Logs (Loki)
Logs are pushed directly from the Pino logger in the API to Loki.
1. Open Grafana and go to **Explore**.
2. Select **Loki** as the data source.
3. Use LogQL to search. Example: `{app="api", level="error"}`.

### 4.3 Viewing Metrics (Prometheus)
The API exposes a `/metrics` endpoint that Prometheus scrapes.
1. Open the pre-provisioned **API Overview** dashboard in Grafana.
2. You can monitor HTTP request latency, error rates (4xx/5xx), and Node.js memory consumption here.

---

## 5. Security & Access Control

### 5.1 Environment Variables
> [!IMPORTANT]
> The `JWT_SECRET` must be at least 32 characters in production. The API will refuse to boot if it detects the default `change_me` secret in a production environment.

### 5.2 Super Admin Recovery
If you lose access to the super admin account, you can re-seed the credentials directly against the database using the seed script:
```bash
SUPERADMIN_EMAIL=admin@example.com \
SUPERADMIN_PASSWORD=NewStrongPassw0rd! \
pnpm seed:super-admin
```
