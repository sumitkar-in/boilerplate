import { registerAs } from '@nestjs/config';

export const tenantConfig = registerAs('tenant', () => ({
  // Optional — set to enable subdomain-based tenant resolution (e.g.
  // "acme" in "acme.example.com"). Falls back to the x-tenant-id header
  // when unset, which is enough for local dev / the test suite.
  baseDomain: process.env.TENANT_BASE_DOMAIN,
}));

export type TenantConfig = ReturnType<typeof tenantConfig>;
