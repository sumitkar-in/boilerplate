/**
 * Builds a `?a=1&b=2` query string from an object, skipping
 * null/undefined/empty values. Shared so every list/audit-log endpoint
 * helper doesn't hand-roll its own URLSearchParams loop.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null> = {},
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `?${query}` : '';
}
