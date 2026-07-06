import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function listNotifications(token, tenantId) {
  const res = makeRequest('GET', '/notifications', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'notifications listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}
