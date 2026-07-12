import type { RouteObject } from 'react-router-dom';
import type { ModuleConfig } from '@boilerplate/contracts';

export type { ModuleConfig };

export type FeatureModule = {
  key: string;
  // Each module's routes.tsx re-exports its module.config.ts's moduleConfig
  // alongside the default route export, so the shell gets nav metadata
  // (navLabel) from the same lazy import used for the routes themselves —
  // see apps/web/src/core/routes/useModuleRoutes.ts.
  load: () => Promise<{ default: RouteObject[]; moduleConfig: ModuleConfig }>;
};

// Reads each frontend module's module.config.ts, lazy-loads its routes.tsx,
// and mounts it into the shell layout — gated by tenant feature flags. A
// tenant without a feature enabled never even triggers the dynamic
// import() for it. See: skills/frontend-module/SKILL.md
const featureModules: FeatureModule[] = [
  // new modules are appended below this line — see scripts/generators/generate-frontend-module.js
  { key: 'visitors', load: () => import('../modules/visitors/routes') },
  { key: 'calendar', load: () => import('../modules/calendar/routes') },
  { key: 'departments', load: () => import('../modules/departments/routes') },
  { key: 'employees', load: () => import('../modules/employees/routes') },
  { key: 'notes', load: () => import('../modules/notes/routes') },
  { key: 'tasks', load: () => import('../modules/tasks/routes') },
  { key: 'documents', load: () => import('../modules/documents/routes') },
  { key: 'bpql', load: () => import('../modules/bpql/routes') },
  { key: 'knowledge-bot', load: () => import('../modules/knowledge-bot/routes') },
];

export function getEnabledModules(enabledFeatureKeys: Set<string>): FeatureModule[] {
  return featureModules.filter((m) => enabledFeatureKeys.has(m.key));
}
