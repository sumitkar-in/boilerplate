import { Navigate, useRoutes, type RouteObject } from 'react-router-dom';
import { useTenant } from '@boilerplate/ui-common';
import { AppShell } from '../layout/AppShell';
import { AcceptInvitePage } from '../pages/AcceptInvitePage';
import { AdminTenantPage } from '../pages/AdminTenantPage';
import { AdminTenantsPage } from '../pages/AdminTenantsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { MembersSettingsPage } from '../pages/MembersSettingsPage';
import { MenuOrderPage } from '../pages/MenuOrderPage';
import { RolesSettingsPage } from '../pages/RolesSettingsPage';
import { TaskDetailPage } from '../../modules/tasks/pages/TaskDetailPage';
import { SecuritySettingsPage } from '../pages/SecuritySettingsPage';
import { AccessPolicySection } from '../pages/settings/AccessPolicySection';
import { BrandingSection } from '../pages/settings/BrandingSection';
import { DashboardSection } from '../pages/settings/DashboardSection';
import { DataSection } from '../pages/settings/DataSection';
import { GeneralSection } from '../pages/settings/GeneralSection';
import { IntegrationsSection } from '../pages/settings/IntegrationsSection';
import { NavigationSection } from '../pages/settings/NavigationSection';
import { NotificationsSection } from '../pages/settings/NotificationsSection';
import { TenantSettingsLayout } from '../pages/settings/TenantSettingsLayout';
import { TwoFactorVerifyPage } from '../pages/TwoFactorVerifyPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequireRole } from './RequireRole';
import { RequireSuperAdmin } from './RequireSuperAdmin';
import { useModuleRoutes } from './useModuleRoutes';

import { SuperAdminShell } from '../layout/SuperAdminShell';

export function AppRoutes() {
  const { status, enabledFeatureKeys } = useTenant();
  const { routeObjects, navItems, loading } = useModuleRoutes(enabledFeatureKeys);

  // useRoutes() must be called unconditionally on every render (Rules of
  // Hooks) — the loading state is expressed as a route tree instead of an
  // early return before the hook.
  const showSpinner = status === 'loading' || loading;

  const routeTree: RouteObject[] = showSpinner
    ? [{ path: '*', element: <FullPageSpinner /> }]
      : [
        { path: '/login', element: <LoginPage /> },
        {
          path: '/super-admin/login',
          element: <LoginPage mode="super-admin" />,
        },
        { path: '/login/2fa', element: <TwoFactorVerifyPage /> },
        { path: '/accept-invite', element: <AcceptInvitePage /> },
        {
          element: <ProtectedRoute />,
          children: [
            {
              element: <SuperAdminShell />,
              children: [
                {
                  path: 'admin',
                  element: (
                    <RequireSuperAdmin>
                      <Navigate to="/admin/tenants" replace />
                    </RequireSuperAdmin>
                  ),
                },
                {
                  path: 'admin/tenants',
                  element: (
                    <RequireSuperAdmin>
                      <AdminTenantsPage />
                    </RequireSuperAdmin>
                  ),
                },
                {
                  path: 'admin/tenants/:tenantId',
                  element: (
                    <RequireSuperAdmin>
                      <AdminTenantPage />
                    </RequireSuperAdmin>
                  ),
                },
                {
                  path: 'admin/menu',
                  element: (
                    <RequireSuperAdmin>
                      <MenuOrderPage scope="global" />
                    </RequireSuperAdmin>
                  ),
                },
              ]
            },
            {
              element: <AppShell navItems={navItems} />,
              children: [
                { index: true, element: <DashboardPage /> },
                { path: 'settings/security', element: <SecuritySettingsPage /> },
                {
                  path: 'settings/tenant',
                  element: (
                    <RequireRole roles={['owner', 'admin']}>
                      <TenantSettingsLayout />
                    </RequireRole>
                  ),
                  children: [
                    { index: true, element: <Navigate to="branding" replace /> },
                    { path: 'branding', element: <BrandingSection /> },
                    { path: 'general', element: <GeneralSection /> },
                    { path: 'dashboard', element: <DashboardSection /> },
                    { path: 'navigation', element: <NavigationSection /> },
                    { path: 'notifications', element: <NotificationsSection /> },
                    { path: 'access-policy', element: <AccessPolicySection /> },
                    { path: 'integrations', element: <IntegrationsSection /> },
                    { path: 'data', element: <DataSection /> },
                  ],
                },
                {
                  path: 'settings/members',
                  element: (
                    <RequireRole roles={['owner', 'admin']}>
                      <MembersSettingsPage />
                    </RequireRole>
                  ),
                },
                {
                  path: 'settings/menu',
                  element: (
                    <RequireRole roles={['owner']}>
                      <MenuOrderPage scope="tenant" />
                    </RequireRole>
                  ),
                },
                {
                  path: 'settings/roles',
                  element: (
                    <RequireRole roles={['owner']}>
                      <RolesSettingsPage />
                    </RequireRole>
                  ),
                },
                { path: 'task/:taskKey', element: <TaskDetailPage /> },
                ...routeObjects,
                { path: '*', element: <DashboardPage /> },
              ],
            },
          ],
        },
        { path: '*', element: <LoginPage /> },
      ];

  return useRoutes(routeTree);
}

function FullPageSpinner() {
  return (
    <div className="full-page-spinner" role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}
