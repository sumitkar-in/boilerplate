import type { ReactNode } from 'react';
import { useTenant, type TenantRole } from '@boilerplate/ui-common';

// Client-side convenience gate only — real enforcement is server-side
// (RolesGuard, see apps/api/src/core/common/guards/roles.guard.ts). This
// just avoids flashing a form a member can't actually submit.
export function RequireRole({ roles, children }: { roles: TenantRole[]; children: ReactNode }) {
  const { role } = useTenant();
  if (!role || !roles.includes(role)) {
    return <p className="forbidden-notice">You don't have permission to view this page.</p>;
  }
  return <>{children}</>;
}
