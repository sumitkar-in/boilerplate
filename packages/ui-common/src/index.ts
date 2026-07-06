// Shared component library used by every frontend module (web + mobile).
// Promote a component here only once a second module needs it — see
// skills/frontend-module/SKILL.md.

// Web UI Building Block Components (web-only DOM components)
export * from './components';

// Shared API transport (web + mobile) — see skills/frontend-module/SKILL.md
export * from './api/http-client';
export * from './api/list-query';
export * from './api/query-string';

// Shared Hooks (web + mobile)
export { TenantReactContext, useTenant } from './hooks/tenant-context';
export type {
  AuthStatus,
  CurrentUser,
  LoginOutcome,
  TenantContextValue,
  TenantRole,
} from './hooks/tenant-context';
export type { SessionType } from '@boilerplate/contracts';
export { useApi } from './hooks/useApi';
export type { UseApiOptions, UseApiReturn } from './hooks/useApi';
export { useFeatureFlag } from './hooks/useFeatureFlag';
export { useServerTable } from './hooks/useServerTable';
export type { ServerTableQuery, UseServerTableResult } from './hooks/useServerTable';
