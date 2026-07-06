import { NotFoundException } from '@nestjs/common';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';

const activeTenant = {
  id: 't1',
  slug: 'acme',
  schemaName: 'tenant_acme',
  status: 'active',
};

function makeReq(
  opts: { hostname?: string; headers?: Record<string, string> } = {},
): any {
  const headers = opts.headers ?? {};
  return {
    hostname: opts.hostname,
    header: (name: string) => headers[name.toLowerCase()],
  };
}

describe('TenantResolverMiddleware', () => {
  it('passes through without setting resolvedTenant when no subdomain/header is present', async () => {
    const tenantsService = { findBySlug: jest.fn() };
    const tenantConfigMock = { baseDomain: undefined };
    const middleware = new TenantResolverMiddleware(
      tenantsService as never,
      tenantConfigMock,
    );
    const req = makeReq();
    const next = jest.fn();

    await middleware.use(req, {} as never, next);

    expect(tenantsService.findBySlug).not.toHaveBeenCalled();
    expect(req.resolvedTenant).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('resolves the tenant from the x-tenant-id header', async () => {
    const tenantsService = {
      findBySlug: jest.fn().mockResolvedValue(activeTenant),
    };
    const tenantConfigMock = { baseDomain: undefined };
    const middleware = new TenantResolverMiddleware(
      tenantsService as never,
      tenantConfigMock,
    );
    const req = makeReq({ headers: { 'x-tenant-id': 'acme' } });
    const next = jest.fn();

    await middleware.use(req, {} as never, next);

    expect(tenantsService.findBySlug).toHaveBeenCalledWith('acme');
    expect(req.resolvedTenant).toEqual({
      tenantId: 't1',
      tenantSlug: 'acme',
      schemaName: 'tenant_acme',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException for an unknown tenant slug', async () => {
    const tenantsService = {
      findBySlug: jest.fn().mockResolvedValue(undefined),
    };
    const tenantConfigMock = { baseDomain: undefined };
    const middleware = new TenantResolverMiddleware(
      tenantsService as never,
      tenantConfigMock,
    );
    const req = makeReq({ headers: { 'x-tenant-id': 'ghost' } });
    const next = jest.fn();

    await expect(middleware.use(req, {} as never, next)).rejects.toThrow(
      NotFoundException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for a suspended tenant', async () => {
    const tenantsService = {
      findBySlug: jest
        .fn()
        .mockResolvedValue({ ...activeTenant, status: 'suspended' }),
    };
    const tenantConfigMock = { baseDomain: undefined };
    const middleware = new TenantResolverMiddleware(
      tenantsService as never,
      tenantConfigMock,
    );
    const req = makeReq({ headers: { 'x-tenant-id': 'acme' } });
    const next = jest.fn();

    await expect(middleware.use(req, {} as never, next)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('resolves the tenant from a subdomain when baseDomain is configured', async () => {
    const tenantsService = {
      findBySlug: jest.fn().mockResolvedValue(activeTenant),
    };
    const tenantConfigMock = { baseDomain: 'example.com' };
    const middleware = new TenantResolverMiddleware(
      tenantsService as never,
      tenantConfigMock,
    );
    const req = makeReq({ hostname: 'acme.example.com' });
    const next = jest.fn();

    await middleware.use(req, {} as never, next);

    expect(tenantsService.findBySlug).toHaveBeenCalledWith('acme');
    expect(req.resolvedTenant.tenantSlug).toBe('acme');
  });
});
