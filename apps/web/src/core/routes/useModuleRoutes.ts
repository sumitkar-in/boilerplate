import { useEffect, useState } from 'react';
import type { RouteObject } from 'react-router-dom';
import { getEnabledModules } from '../module-loader';

export type ModuleNavItem = { key: string; navLabel: string; icon?: string };

type ModuleRoutesState = {
  routeObjects: RouteObject[];
  navItems: ModuleNavItem[];
  loading: boolean;
};

// Resolves the enabled modules' routes.tsx (and their re-exported
// module.config) — only ever calls .load() for keys present in
// enabledFeatureKeys, so a disabled module's bundle is never fetched.
// See: docs/multi-tenant-modular-boilerplate-architecture.md §11.1
export function useModuleRoutes(enabledFeatureKeys: Set<string>): ModuleRoutesState {
  const keysSignature = Array.from(enabledFeatureKeys).sort().join(',');
  const [state, setState] = useState<ModuleRoutesState>({ routeObjects: [], navItems: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    const modules = getEnabledModules(enabledFeatureKeys);
    Promise.all(modules.map((m) => m.load())).then((loaded) => {
      if (cancelled) return;
      const routeObjects: RouteObject[] = loaded.map((mod, i) => ({
        path: modules[i].key,
        children: mod.default,
      }));
      const navItems: ModuleNavItem[] = loaded.map((mod, i) => ({
        key: modules[i].key,
        navLabel: mod.moduleConfig.navLabel ?? mod.moduleConfig.label,
        icon: (mod.moduleConfig as { icon?: string }).icon,
      }));
      setState({ routeObjects, navItems, loading: false });
    });

    return () => {
      cancelled = true;
    };
    // keysSignature is the stable dependency — enabledFeatureKeys itself is a
    // new Set() instance on every TenantProvider re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  return state;
}
