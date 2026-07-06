// This module's own API calls/hooks — talks to the matching backend
// routes at apps/api/src/modules/{{featureKey}}/{{featureKey}}.controller.ts
// (gated by @RequireFeature('{{featureKey}}')).
//
// export async function fetch{{FeatureName}}() {
//   const res = await fetch('/api/{{featureKey}}', { headers: { 'x-tenant-id': tenantId } });
//   return res.json();
// }
export {};
