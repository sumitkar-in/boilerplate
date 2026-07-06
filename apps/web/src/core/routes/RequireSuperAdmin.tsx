import type { ReactNode } from 'react';
import { useTenant } from '@boilerplate/ui-common';

// Client-side convenience gate only — real enforcement is server-side
// (SuperAdminGuard, see apps/api/src/core/common/guards/super-admin.guard.ts).
// Distinct from RequireRole: isSuperAdmin is platform-wide, not tied to the
// current tenant's role.
export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user } = useTenant();
  if (!user?.isSuperAdmin) {
    return <p className="forbidden-notice">You don't have permission to view this page.</p>;
  }
  return <>{children}</>;
}
