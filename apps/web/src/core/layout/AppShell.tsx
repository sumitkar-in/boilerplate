import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { meetsMinimumRole } from '@boilerplate/contracts';
import { useTenant } from '@boilerplate/ui-common';
import type { ModuleNavItem } from '../routes/useModuleRoutes';
import type { CustomMenuItem } from '@boilerplate/contracts';
import { AppSidebar, type ShellNavItem } from './components/AppSidebar';
import { AppTopbar } from './components/AppTopbar';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { ChatWidget } from './components/ChatWidget';
import { PageMotion } from '../components/PageMotion';
import { useStoredState } from '../hooks/useStoredState';
import i18n from '../i18n/i18n';
import {
  apiGetGlobalMenuOrder,
  apiGetTenantMenuOrder,
  apiGetTenantSettings,
  type TenantSettings,
} from '../api-client';
import './AppShell.css';

type MenuOrderNode = CustomMenuItem | string;
const SIDEBAR_COLLAPSED_KEY = 'boilerplate.sidebarCollapsed';
const SIDEBAR_COLLAPSED_USER_KEY = 'boilerplate.sidebarCollapsed.userOverride';

function buildCustomMenu(items: ShellNavItem[], customOrder: CustomMenuItem[]): ShellNavItem[] {
  if (!customOrder.length) return items;
  
  const byKey = new Map(items.map((item) => [item.key, item]));

  function consumeNode(node: CustomMenuItem | string) {
    const menuItem = typeof node === 'string' ? { id: node } : node;
    if (!menuItem?.id) return;
    byKey.delete(menuItem.id);
    menuItem.children?.forEach(consumeNode);
  }
  
  function mapNode(node: CustomMenuItem | string): ShellNavItem | null {
    if (typeof node === 'string') {
      node = { id: node } as CustomMenuItem;
    }
    if (!node || !node.id) return null;
    
    const existing = byKey.get(node.id);
    if (existing) byKey.delete(node.id);
    if (node.hidden) {
      node.children?.forEach(consumeNode);
      return null;
    }
    
    if (!existing) {
      if (!node.id.startsWith('custom-')) return null;
      const children = (node.children || []).map(mapNode).filter(Boolean) as ShellNavItem[];
      if (children.length === 0) return null;
      return {
        key: node.id,
        label: node.label || 'Folder',
        path: '#',
        icon: node.icon || 'folder',
        children,
      };
    }
    
    const children = (node.children || []).map(mapNode).filter(Boolean) as ShellNavItem[];
    
    return {
      ...existing,
      label: node.label || existing.label,
      icon: node.icon || existing.icon,
      children: children.length > 0 ? children : undefined,
    };
  }
  
  const ordered = customOrder.map(mapNode).filter(Boolean) as ShellNavItem[];
  const leftover = items.filter((item) => byKey.has(item.key));
  
  return [...ordered, ...leftover];
}

export function AppShell({ navItems }: { navItems: ModuleNavItem[] }) {
  const {
    role,
    user,
    sessionType,
    logout,
  } = useTenant();
  const navigate = useNavigate();
  const isPlatformSession = sessionType === 'platform';
  const [sidebarCollapsed, setSidebarCollapsed, hasStoredSidebarCollapsed] = useStoredState(SIDEBAR_COLLAPSED_KEY, false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOrder, setMenuOrder] = useState<CustomMenuItem[]>([]);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    const request = isPlatformSession ? apiGetGlobalMenuOrder() : apiGetTenantMenuOrder();
    request.then(
      (res) => {
        if (!cancelled) {
          const normalized = (res.itemOrder as MenuOrderNode[]).map((item) => (
            typeof item === 'string' ? { id: item } : item
          ));
          setMenuOrder(normalized);
        }
      },
      () => {
        if (!cancelled) setMenuOrder([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isPlatformSession]);

  useEffect(() => {
    if (isPlatformSession) return;
    let cancelled = false;
    apiGetTenantSettings().then(
      (settings) => {
        if (cancelled) return;
        setTenantSettings(settings);
        document.documentElement.style.setProperty('--accent', settings.brandColor);
        document.title = settings.companyName
          ? `${settings.companyName} · Boilerplate`
          : 'Boilerplate';
        if (settings.settings.general.locale && i18n.language !== settings.settings.general.locale) {
          localStorage.setItem('boilerplate.language', settings.settings.general.locale);
          void i18n.changeLanguage(settings.settings.general.locale);
        }
        if (!hasStoredSidebarCollapsed && localStorage.getItem(SIDEBAR_COLLAPSED_USER_KEY) !== 'true') {
          setSidebarCollapsed(settings.settings.navigation.defaultCollapsed);
        }
      },
      () => {
        if (!cancelled) setTenantSettings(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hasStoredSidebarCollapsed, isPlatformSession, setSidebarCollapsed]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate(isPlatformSession ? '/super-admin/login' : '/login', { replace: true });
  }, [isPlatformSession, logout, navigate]);

  useEffect(() => {
    const sessionTimeoutMinutes = tenantSettings?.settings.security.sessionTimeoutMinutes;
    if (isPlatformSession || !sessionTimeoutMinutes) return;

    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        handleLogout();
      }, sessionTimeoutMinutes * 60 * 1000);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [tenantSettings?.settings.security.sessionTimeoutMinutes, isPlatformSession, handleLogout]);

  const allNavItems = useMemo<ShellNavItem[]>(() => {
    const items: ShellNavItem[] = [
      {
        key: 'dashboard',
        label: 'Dashboard',
        path: '/',
        end: true,
        category: 'Core',
        description: 'Tenant overview and enabled modules',
        icon: 'dashboard',
      },
      {
        key: 'security',
        label: 'Security',
        path: '/settings/security',
        category: 'Settings',
        description: 'Two-factor authentication and account protection',
        icon: 'shield',
      },
    ];
    if (meetsMinimumRole(role, 'admin')) {
      items.push({
        key: 'tenant-settings',
        label: 'Tenant settings',
        path: '/settings/tenant',
        icon: 'settings',
        category: 'Settings',
        description: 'Company branding, default color, and logo',
      });
      items.push({
        key: 'settings.roles',
        label: 'Roles',
        path: '/settings/roles',
        icon: 'users',
        category: 'Settings',
        description: 'Manage tenant roles and permissions',
      });
      items.push({
        key: 'settings.menu',
        label: 'Menu order',
        path: '/settings/menu',
        icon: 'menu',
        category: 'Settings',
        description: 'Arrange the navigation menu',
      });
      items.push({
        key: 'members',
        label: 'Members',
        path: '/settings/members',
        icon: 'user-plus',
        category: 'Settings',
        description: 'Invite users and manage workspace roles',
      });
    }
    if (isPlatformSession) {
      items.push({
        key: 'admin.tenants',
        label: 'Tenants',
        path: '/admin/tenants',
        icon: 'building',
        category: 'Platform',
        description: 'Manage tenant status, modules, and impersonation',
      });
      items.push({
        key: 'admin.menu',
        label: 'Menu order',
        path: '/admin/menu',
        icon: 'settings',
        category: 'Platform',
        description: 'Arrange the default platform navigation menu',
      });
    }
    items.push(
      ...navItems.map((item) => ({
        key: item.key,
        label: item.navLabel,
        path: `/${item.key}`,
        icon: item.icon || item.key,
        category: 'Modules',
        description: `Open ${item.navLabel}`,
      })),
    );
    return items;
  }, [isPlatformSession, navItems, role]);

  const orderedNavItems = useMemo(() => {
    return buildCustomMenu(allNavItems, menuOrder);
  }, [allNavItems, menuOrder]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allNavItems.slice(0, 8);
    return allNavItems
      .map((item) => {
        const label = item.label.toLowerCase();
        const haystack = `${item.label} ${item.key} ${item.path} ${item.category ?? ''} ${item.description ?? ''}`.toLowerCase();
        let score = Number.POSITIVE_INFINITY;
        if (label === query) score = 0;
        else if (label.startsWith(query)) score = 1;
        else if (label.includes(query)) score = 2;
        else if (haystack.includes(query)) score = 3;
        return { item, score };
      })
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
      .map((entry) => entry.item)
      .slice(0, 10);
  }, [searchQuery, allNavItems]);

  function goTo(path: string) {
    setSearchQuery('');
    setSidebarOpen(false);
    navigate(path);
  }

  function toggleSidebarCollapsed() {
    localStorage.setItem(SIDEBAR_COLLAPSED_USER_KEY, 'true');
    setSidebarCollapsed((collapsed) => !collapsed);
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}${sidebarOpen ? ' app-shell--nav-open' : ''}`}>
      <button
        type="button"
        className="app-shell__nav-overlay"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <AppSidebar
        sidebarCollapsed={sidebarCollapsed}
        onNavigate={() => setSidebarOpen(false)}
        user={user}
        onSettings={() => goTo('/settings/security')}
        onLogout={() => void handleLogout()}
        isPlatformSession={isPlatformSession}
        role={role ?? undefined}
        navItems={orderedNavItems}
        branding={{
          companyName: tenantSettings?.companyName ?? undefined,
          logoUrl: tenantSettings?.logoUrl ?? undefined,
        }}
        moduleGrouping={tenantSettings?.settings.navigation.moduleGrouping ?? 'category'}
      />
      <div className="app-shell__main">
        {sessionType === 'impersonation' && <ImpersonationBanner />}
        {tenantSettings?.settings.navigation.showSearch !== false ? (
          <AppTopbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            onSelectSearchResult={goTo}
            onOpenSidebar={() => setSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapse={toggleSidebarCollapsed}
            tenantName={tenantSettings?.companyName ?? undefined}
          />
        ) : (
          <AppTopbar
            searchQuery=""
            onSearchChange={() => undefined}
            searchResults={[]}
            onSelectSearchResult={goTo}
            onOpenSidebar={() => setSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapse={toggleSidebarCollapsed}
            tenantName={tenantSettings?.companyName ?? undefined}
            hideSearch
          />
        )}
        <main className="app-shell__content">
          <PageMotion>
            <Outlet />
          </PageMotion>
        </main>
        <ChatWidget />
      </div>
    </div>
  );
}
