// This module's own API calls/hooks — usually re-exports the matching
// apps/web/src/modules/{{featureKey}}/api/ logic (same REST endpoints, same
// TenantContext header handling). See: skills/frontend-module/SKILL.md
//
// export async function fetch{{FeatureName}}() {
//   const res = await fetch(`${API_URL}/{{featureKey}}`, { headers: { 'x-tenant-id': tenantId } });
//   return res.json();
// }
export {};
