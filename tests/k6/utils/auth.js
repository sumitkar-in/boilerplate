import { check, fail } from 'k6';
import { jsonOrNull, makeRequest } from './api.js';
import { config } from './config.js';

export function superAdminLogin() {
  const payload = {
    email: config.superAdmin.email,
    password: config.superAdmin.password,
  };

  const res = makeRequest('POST', '/auth/super-admin/login', payload);
  
  check(res, {
    'super admin login successful': (r) => r && (r.status === 200 || r.status === 201),
    'has access token': (r) => jsonOrNull(r, 'accessToken') !== null,
  });

  const token = jsonOrNull(res, 'accessToken');
  if (!token) {
    fail(
      `Super-admin login failed for ${config.superAdmin.email}. ` +
        'Run ./setup.sh or pnpm seed:super-admin with the same SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD used for k6.',
    );
  }

  return token;
}

export function impersonateTenantUser(superAdminToken, tenantId, userId) {
  const res = makeRequest('POST', `/auth/super-admin/tenants/${tenantId}/users/${userId}/impersonate`, null, {
    Authorization: `Bearer ${superAdminToken}`
  });
  
  check(res, {
    'impersonation successful': (r) => r && (r.status === 200 || r.status === 201),
  });

  return jsonOrNull(res, 'accessToken');
}
