#!/usr/bin/env node
// Tiny {{placeholder}} template renderer, shared by every generator script.
// No dependencies — string replace only, matches the `{{featureName}}` /
// `{{FeatureName}}` style described in docs/multi-tenant-modular-boilerplate-architecture.md §10.2.

function renderTemplate(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (whole, key) => {
    if (!(key in vars)) {
      throw new Error(`Unknown template placeholder {{${key}}} — no value provided for it.`);
    }
    return vars[key];
  });
}

module.exports = { renderTemplate };
