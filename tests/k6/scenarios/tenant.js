import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createTenant(token, index) {
  const randomStr = Math.random().toString(36).substring(7);
  const payload = {
    slug: `test-tenant-${__VU}-${__ITER}-${randomStr}`,
    features: ['employees', 'departments', 'tasks', 'notes', 'documents', 'notifications'],
  };

  const res = makeRequest('POST', '/admin/tenants', payload, {
    Authorization: `Bearer ${token}`,
  });

  check(res, {
    'tenant created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listTenants(token) {
  const res = makeRequest('GET', '/admin/tenants', null, {
    Authorization: `Bearer ${token}`,
  });

  check(res, {
    'tenants listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function createTenantOwner(superAdminToken, tenantId, index) {
  const payload = {
    email: `owner.${tenantId}.${index}.${__VU}.${__ITER}@example.com`,
    fullName: `Tenant Owner ${index}`,
    role: 'owner',
  };

  const res = makeRequest('POST', `/auth/super-admin/tenants/${tenantId}/users`, payload, {
    Authorization: `Bearer ${superAdminToken}`,
  });

  check(res, {
    'tenant owner created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function tenantLogin(tenantSlug, email, password) {
  const res = makeRequest('POST', '/auth/login', { email, password }, {
    'x-tenant-id': tenantSlug,
  });

  check(res, {
    'tenant login successful': (r) => r && (r.status === 200 || r.status === 201),
    'tenant token returned': (r) => jsonOrNull(r, 'accessToken') !== null,
  });

  return jsonOrNull(res, 'accessToken');
}

export function updateTenantStatus(token, tenantId, status) {
  const res = makeRequest('PATCH', `/admin/tenants/${tenantId}/status`, { status }, {
    Authorization: `Bearer ${token}`,
  });

  check(res, {
    'tenant status updated': (r) => r && r.status === 200,
  });
}

export function deleteTenant(token, tenantId) {
  const res = makeRequest('DELETE', `/admin/tenants/${tenantId}`, null, {
    Authorization: `Bearer ${token}`,
  });

  check(res, {
    'tenant deleted': (r) => r && r.status === 200,
  });
}
