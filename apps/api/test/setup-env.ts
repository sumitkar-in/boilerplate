import { resolve } from 'node:path';
import { config } from 'dotenv';

// e2e tests run via `pnpm --filter api test:e2e` (cwd=apps/api), so a bare
// `dotenv/config` (which defaults to `${cwd}/.env`) would miss the repo
// root .env — resolve it explicitly, same as apps/api/src/main.ts.
config({ path: resolve(__dirname, '../../../.env') });

// Bypass rate limiting for E2E tests, which hammer the login endpoint
process.env.THROTTLE_LIMIT_OVERRIDE =
  process.env.THROTTLE_LIMIT_OVERRIDE || '1000';

// Disable observability to prevent pino-loki worker thread from hanging the test runner
process.env.OBSERVABILITY_ENABLED = 'false';
