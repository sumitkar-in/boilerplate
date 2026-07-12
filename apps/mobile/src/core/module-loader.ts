import type { ComponentType } from 'react';

export type FeatureModule = {
  key: string;
  load: () => Promise<{ default: ComponentType }>;
};

// Mobile equivalent of apps/web/src/core/module-loader.ts — lazy-loads a
// feature module's navigation stack, gated by tenant feature flags. Uses
// plain @react-navigation (not Expo Router) deliberately: this registry
// pattern mirrors the web shell's manual react-router-dom setup so the
// generator and feature-flag gating logic stay identical on both
// platforms — see §11.4 of the architecture doc. See: skills/frontend-module/SKILL.md
const featureModules: FeatureModule[] = [
  // new modules are appended below this line — see scripts/generators/generate-frontend-module.js
  { key: 'visitors', load: () => import('../modules/visitors/navigation') },
  { key: 'employees', load: () => import('../modules/employees/navigation') },
  { key: 'notes', load: () => import('../modules/notes/navigation') },
];

export function getEnabledModules(enabledFeatureKeys: Set<string>): FeatureModule[] {
  return featureModules.filter((m) => enabledFeatureKeys.has(m.key));
}
