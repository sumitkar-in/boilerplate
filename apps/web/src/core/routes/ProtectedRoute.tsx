import { Navigate, Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useTenant } from '@boilerplate/ui-common';

export function ProtectedRoute() {
  const { status } = useTenant();
  const location = useLocation();
  if (status === 'unauthenticated') {
    return (
      <Navigate
        to={location.pathname.startsWith('/admin') ? '/super-admin/login' : '/login'}
        replace
      />
    );
  }
  return <Outlet />;
}
