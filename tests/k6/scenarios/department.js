import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createDepartment(token, tenantId, index) {
  const payload = {
    name: `Dept ${index} - ${__VU}-${__ITER}`,
    description: `Test department ${index}`,
  };

  const res = makeRequest('POST', '/departments', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'department created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listDepartments(token, tenantId) {
  const res = makeRequest('GET', '/departments', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'departments listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updateDepartment(token, tenantId, deptId) {
  const payload = {
    description: `Updated description for dept ${deptId}`,
  };

  const res = makeRequest('PATCH', `/departments/${deptId}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'department updated': (r) => r && r.status === 200,
  });
}

export function deleteDepartment(token, tenantId, deptId) {
  const res = makeRequest('DELETE', `/departments/${deptId}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'department deleted': (r) => r && r.status === 200,
  });
}
