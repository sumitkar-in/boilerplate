import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createVisitor(token, tenantId, index) {
  const payload = {
    name: `Name ${index} - ${__VU}-${__ITER}`,
    email: `visitor-${index}-vu${__VU}-${__ITER}@example.com`,
    phone: `+1555${String(1000000 + index).slice(1)}`,
    entryTime: new Date().toISOString(),
    exitTime: new Date().toISOString(),
  };

  const res = makeRequest('POST', '/visitors', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'visitor created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listVisitors(token, tenantId) {
  const res = makeRequest('GET', '/visitors', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'visitors listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updateVisitor(token, tenantId, id) {
  const payload = {
    name: `Updated name for ${id}`,
  };

  const res = makeRequest('PATCH', `/visitors/${id}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'visitor updated': (r) => r && r.status === 200,
  });
}

export function deleteVisitor(token, tenantId, id) {
  const res = makeRequest('DELETE', `/visitors/${id}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'visitor deleted': (r) => r && r.status === 200,
  });
}
