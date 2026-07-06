import type { ModuleConfig } from '@boilerplate/contracts';

// Read by apps/web/src/core/module-loader.ts to decide nav label/icon once
// this module is lazy-loaded. The `key` must match this module's
// feature.json key on the backend. See: skills/frontend-module/SKILL.md
export const moduleConfig: ModuleConfig = {
  key: '{{featureKey}}',
  label: '{{FeatureLabel}}',
  navLabel: '{{FeatureLabel}}',
};
