import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createCustomField(token, tenantId, index) {
  const payload = {
    label: `Custom Field ${index} ${__VU} ${__ITER}`,
    type: 'text',
  };

  const res = makeRequest('POST', '/employees/custom-fields', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'custom field created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listCustomFields(token, tenantId) {
  const res = makeRequest('GET', '/employees/custom-fields', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'custom fields listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updateCustomField(token, tenantId, fieldId) {
  const payload = {
    label: `Updated Field Label ${fieldId}`,
  };

  const res = makeRequest('PATCH', `/employees/custom-fields/${fieldId}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'custom field updated': (r) => r && r.status === 200,
  });
}

export function deleteCustomField(token, tenantId, fieldId) {
  const res = makeRequest('DELETE', `/employees/custom-fields/${fieldId}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'custom field deleted': (r) => r && r.status === 200,
  });
}

export function createEmployee(token, tenantId, deptId, index, customFields = {}) {
  const payload = {
    name: `John Doe ${index}`,
    phone: `+1555${String(__VU).padStart(2, '0')}${String(__ITER).padStart(2, '0')}${String(index).padStart(5, '0')}`,
    email: `john.doe.${index}.${__VU}.${__ITER}@example.com`,
    departmentId: deptId,
    customFields,
  };

  const res = makeRequest('POST', '/employees', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'employee created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listEmployees(token, tenantId) {
  const res = makeRequest('GET', '/employees', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'employees listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updateEmployee(token, tenantId, empId) {
  const payload = {
    phone: '+15559990000',
  };

  const res = makeRequest('PATCH', `/employees/${empId}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'employee updated': (r) => r && r.status === 200,
  });
}

export function deleteEmployee(token, tenantId, empId) {
  const res = makeRequest('DELETE', `/employees/${empId}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'employee deleted': (r) => r && r.status === 200,
  });
}
