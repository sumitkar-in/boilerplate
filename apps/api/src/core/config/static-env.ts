/**
 * Env reads that must happen at module-composition time (decorator
 * evaluation), before Nest DI — and therefore before ConfigService —
 * exists: conditional module imports in app.module.ts and bootstrap
 * options in main.ts. Everything else must go through the namespaced
 * configs in this directory.
 */
export const staticEnv = {
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  get isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  },
  get isJest(): boolean {
    return process.env.JEST_WORKER_ID !== undefined;
  },
  get observabilityEnabled(): boolean {
    return process.env.OBSERVABILITY_ENABLED === 'true';
  },
};
