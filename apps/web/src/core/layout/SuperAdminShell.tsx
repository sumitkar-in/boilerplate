import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, LayoutGrid, MenuSquare, Blocks } from 'lucide-react';
import { useTenant } from '@boilerplate/ui-common';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageMotion } from '../components/PageMotion';

export function SuperAdminShell() {
  const { logout, sessionType } = useTenant();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/super-admin/login', { replace: true });
  }

  if (sessionType !== 'platform') {
    return (
      <div className="forbidden-notice">
        You must be in a platform session to view this area.
      </div>
    );
  }

  return (
    <div className="super-admin-shell">
      <header className="super-admin-header">
        <div className="super-admin-header__brand">
          <Blocks size={20} className="super-admin-brand-icon" />
          <span className="super-admin-brand-text">Platform Admin</span>
        </div>
        
        <nav className="super-admin-nav">
          <NavLink
            to="/admin/tenants"
            className={({ isActive }) => `super-admin-nav__link ${isActive ? 'active' : ''}`}
          >
            <LayoutGrid size={16} />
            <span>Tenants</span>
          </NavLink>
          <NavLink
            to="/admin/menu"
            className={({ isActive }) => `super-admin-nav__link ${isActive ? 'active' : ''}`}
          >
            <MenuSquare size={16} />
            <span>Global Menu Order</span>
          </NavLink>
        </nav>

        <div className="super-admin-header__actions">
          <ThemeToggle />
          <button className="super-admin-header__logout" onClick={() => void handleLogout()} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="super-admin-main">
        <div className="super-admin-content-wrap">
          <PageMotion>
            <Outlet />
          </PageMotion>
        </div>
      </main>
    </div>
  );
}
