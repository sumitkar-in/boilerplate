function normalizeBaseUrl(input) {
  const trimmed = (input || 'https://localhost/api').replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
}

export const config = {
  baseUrl: normalizeBaseUrl(__ENV.API_URL),
  superAdmin: {
    email: __ENV.SUPERADMIN_EMAIL || 'admin@example.com',
    password: __ENV.SUPERADMIN_PASSWORD || 'SuperAdminPassw0rd1!',
  },
  load: {
    vus: Number(__ENV.K6_VUS || 20),
    departmentsPerTenant: Number(__ENV.K6_DEPARTMENTS_PER_TENANT || 20),
    employeesPerTenant: Number(__ENV.K6_EMPLOYEES_PER_TENANT || 100),
  },
};
