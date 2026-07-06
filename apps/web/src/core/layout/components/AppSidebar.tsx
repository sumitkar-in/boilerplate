import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Blocks,
  ChevronsUpDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { type TenantRole } from '@boilerplate/contracts';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@boilerplate/ui-common';
import { AppIcon } from './AppIcon';
import { ThemeToggle } from '../../components/ThemeToggle';

export type ShellNavItem = {
  key: string;
  label: string;
  path: string;
  icon?: string;
  end?: boolean;
  category?: string;
  description?: string;
  children?: ShellNavItem[];
};

type AppSidebarProps = {
  sidebarCollapsed: boolean;
  onNavigate: () => void;
  user?: { fullName?: string | null; email?: string } | null;
  onSettings: () => void;
  onLogout: () => void;
  isPlatformSession: boolean;
  role?: TenantRole;
  navItems: ShellNavItem[];
  branding?: {
    companyName?: string;
    logoUrl?: string;
  };
  moduleGrouping?: 'category' | 'flat';
};



export function AppSidebar({
  sidebarCollapsed,
  onNavigate,
  user,
  onSettings,
  onLogout,
  navItems,
  branding,
  moduleGrouping = 'category',
}: AppSidebarProps) {
  const { t } = useTranslation();
  const accountRef = useRef<HTMLDivElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const email = user?.email || '';
  const displayName = user?.fullName || email.split('@')[0] || 'Account';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const brandName = branding?.companyName || t('shell.brand');

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  function renderNavItem(item: ShellNavItem) {
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton asChild tooltip={sidebarCollapsed ? item.label : undefined}>
          <NavLink
            to={item.path}
            className="app-shell__nav-link"
            end={item.end}
            onClick={onNavigate}
          >
            <span className="app-shell__nav-icon">
              <AppIcon name={item.icon || item.key} size={16} />
            </span>
            <span className="app-shell__nav-label">{item.label}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const hasCustomGroups = navItems.some((item) => item.children && item.children.length > 0);

  function renderFlatGroup(items: ShellNavItem[], key: string, label?: string) {
    return (
      <SidebarGroup key={key}>
        {label && <SidebarGroupLabel className="app-shell__nav-section">{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  function renderNavigation() {
    if (!hasCustomGroups && moduleGrouping === 'category') {
      const groups = new Map<string, ShellNavItem[]>();
      navItems.forEach((item) => {
        const category = item.category || 'Other';
        groups.set(category, [...(groups.get(category) ?? []), item]);
      });
      return Array.from(groups.entries()).map(([category, items]) => renderFlatGroup(items, `category-${category}`, category));
    }

    const elements: ReactNode[] = [];
    let currentFlatGroup: ShellNavItem[] = [];

    const flushFlatGroup = () => {
      if (currentFlatGroup.length > 0) {
        elements.push(renderFlatGroup(currentFlatGroup, `flat-${elements.length}`));
        currentFlatGroup = [];
      }
    };

    navItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        flushFlatGroup();
        elements.push(
          <SidebarGroup key={item.key}>
            <SidebarGroupLabel className="app-shell__nav-section">{item.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.children.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      } else {
        currentFlatGroup.push(item);
      }
    });
    flushFlatGroup();
    return elements;
  }

  return (
    <Sidebar
      className="app-shell__sidebar"
      state={sidebarCollapsed ? 'collapsed' : 'expanded'}
      collapsible="icon"
      aria-label="Primary navigation"
    >
      <SidebarHeader className="app-shell__brand">
        <span className="app-shell__brand-mark">
          {branding?.logoUrl ? <img src={branding.logoUrl} alt="" /> : <Blocks size={21} />}
        </span>
        <span className="app-shell__brand-label">{brandName}</span>
      </SidebarHeader>

      <SidebarContent className="app-shell__nav">
        {renderNavigation()}
      </SidebarContent>

      <SidebarFooter className="app-shell__account" ref={accountRef}>
        {isAccountMenuOpen && !sidebarCollapsed && (
          <div className="app-shell__account-menu">
            <div className="app-shell__account-card">
              <span className="app-shell__account-avatar">{initials || 'A'}</span>
              <span className="app-shell__account-card-main">
                <strong>{displayName}</strong>
                {email && <small>{email}</small>}
              </span>
            </div>
            <button
              type="button"
              className="app-shell__account-menu-item"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onSettings();
              }}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <ThemeToggle className="app-shell__account-menu-item app-shell__theme-menu-item" showLabel />
            <button
              type="button"
              className="app-shell__account-menu-item"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onLogout();
              }}
            >
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className="app-shell__account-trigger"
          onClick={() => setIsAccountMenuOpen((open) => !open)}
          title={displayName}
          aria-haspopup="menu"
          aria-expanded={isAccountMenuOpen}
        >
          <span className="app-shell__account-avatar">{initials || 'A'}</span>
          <span className="app-shell__account-identity">
            <span className="app-shell__account-name">{displayName}</span>
            {email && <span className="app-shell__account-email">{email}</span>}
          </span>
          <ChevronsUpDown size={16} className="app-shell__account-caret" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
