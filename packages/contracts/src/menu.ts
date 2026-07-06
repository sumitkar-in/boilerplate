export const CORE_MENU_KEYS = [
  'dashboard',
  'tenant-settings',
  'security',
  'members',
  'settings.menu',
  'settings.roles',
] as const;

export const PLATFORM_MENU_KEYS = ['admin.tenants', 'admin.menu'] as const;

export type CoreMenuKey = (typeof CORE_MENU_KEYS)[number];
export type PlatformMenuKey = (typeof PLATFORM_MENU_KEYS)[number];

export type CustomMenuItem = {
  id: string;
  label?: string;
  icon?: string;
  hidden?: boolean;
  children?: CustomMenuItem[];
};
