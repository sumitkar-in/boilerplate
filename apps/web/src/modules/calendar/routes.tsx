import type { RouteObject } from 'react-router-dom';
import { CalendarPage } from './pages/CalendarPage';

// This module's own routes, lazy-loaded by apps/web/src/core/module-loader.ts
// — only fetched once the tenant has "calendar" enabled.
// See: skills/frontend-module/SKILL.md
const routes: RouteObject[] = [{ index: true, element: <CalendarPage /> }];

// Re-exported alongside the routes so the shell's module-loader can read
// nav metadata from the same lazy import — see core/routes/useModuleRoutes.ts.
export { moduleConfig } from './module.config';

export default routes;
