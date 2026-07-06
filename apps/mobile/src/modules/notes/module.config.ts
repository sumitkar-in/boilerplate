import type { ModuleConfig } from '@boilerplate/contracts';

// Read by apps/mobile/src/core/module-loader.ts to decide nav label/icon
// once this module is lazy-loaded. The `key` must match this module's
// feature.json key on the backend, and the web module's module.config.ts
// key if it has one too. See: skills/frontend-module/SKILL.md
export const moduleConfig: ModuleConfig = {
  key: 'notes',
  label: 'Notes',
  navLabel: 'Notes',
};
