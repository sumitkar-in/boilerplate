import { AuthContextMiddleware } from './auth-context.middleware';
import { getTenantContext } from '../tenants/tenant-context';

describe('AuthContextMiddleware', () => {
  const activeTenant = {
    id: 't1',
    slug: 'acme',
    schemaName: 'tenant_acme',
    status: 'active',
  };
  const activeMembership = {
    role: 'admin',
    roleKey: 'admin',
    status: 'active',
  };
  const activeUser = { id: 'u1', isActive: true, isSuperAdmin: false };

  function makeMiddleware(opts?: {
    verifyAsync?: jest.Mock;
    findById?: jest.Mock;
    getMembership?: jest.Mock;
    getRolePermissions?: jest.Mock;
    getEnabledFeatureKeys?: jest.Mock;
    findUserById?: jest.Mock;
  }) {
    const jwtService = {
      verifyAsync:
        opts?.verifyAsync ??
        jest.fn().mockResolvedValue({
          sub: 'u1',
          tenantId: 't1',
          tenantSlug: 'acme',
          role: 'admin',
          purpose: 'access',
        }),
    };
    const tenantsService = {
      findById: opts?.findById ?? jest.fn().mockResolvedValue(activeTenant),
    };
    const membershipsService = {
      getMembership:
        opts?.getMembership ?? jest.fn().mockResolvedValue(activeMembership),
    };
    const tenantRolesService = {
      getRolePermissions:
        opts?.getRolePermissions ??
        jest.fn().mockResolvedValue(['tenant:settings:read', 'modules:*']),
    };
    const featureFlagsService = {
      getEnabledFeatureKeys:
        opts?.getEnabledFeatureKeys ??
        jest.fn().mockResolvedValue(new Set(['notes'])),
    };
    const usersService = {
      findById: opts?.findUserById ?? jest.fn().mockResolvedValue(activeUser),
    };
    const middleware = new AuthContextMiddleware(
      jwtService as never,
      tenantsService as never,
      membershipsService as never,
      tenantRolesService as never,
      featureFlagsService as never,
      usersService as never,
    );
    return {
      middleware,
      jwtService,
      tenantsService,
      membershipsService,
      tenantRolesService,
      featureFlagsService,
      usersService,
    };
  }

  function makeReq(headers: Record<string, string> = {}) {
    return { header: (name: string) => headers[name.toLowerCase()] } as never;
  }

  it('calls next() without setting request.user when no Authorization header is present', async () => {
    const { middleware } = makeMiddleware();
    const req: any = makeReq();
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('calls next() without setting request.user for a non-Bearer Authorization header', async () => {
    const { middleware } = makeMiddleware();
    const req: any = makeReq({ authorization: 'Basic abc123' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('calls next() without setting request.user when the token fails verification', async () => {
    const { middleware } = makeMiddleware({
      verifyAsync: jest.fn().mockRejectedValue(new Error('bad token')),
    });
    const req: any = makeReq({ authorization: 'Bearer invalid' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('ignores a token whose purpose is not "access" (e.g. a 2fa-pending token)', async () => {
    const { middleware } = makeMiddleware({
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        purpose: '2fa-pending',
      }),
    });
    const req: any = makeReq({ authorization: 'Bearer partial' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores the token when the tenant is missing or inactive', async () => {
    const { middleware } = makeMiddleware({
      findById: jest.fn().mockResolvedValue(undefined),
    });
    const req: any = makeReq({ authorization: 'Bearer valid' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores the token when the membership is missing or not active', async () => {
    const { middleware } = makeMiddleware({
      getMembership: jest
        .fn()
        .mockResolvedValue({ role: 'member', status: 'invited' }),
    });
    const req: any = makeReq({ authorization: 'Bearer valid' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores the token when the user is missing or inactive', async () => {
    const { middleware } = makeMiddleware({
      findUserById: jest.fn().mockResolvedValue(undefined),
    });
    const req: any = makeReq({ authorization: 'Bearer valid' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('grants a super admin owner-level access without checking membership', async () => {
    const getMembership = jest.fn();
    const { middleware } = makeMiddleware({
      findUserById: jest
        .fn()
        .mockResolvedValue({ id: 'u1', isActive: true, isSuperAdmin: true }),
      getMembership,
    });
    const req: any = makeReq({ authorization: 'Bearer valid' });
    const next = jest.fn();

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ role: 'owner', userId: 'u1' });
    expect(getMembership).not.toHaveBeenCalled();
  });

  it('sets request.user and makes getTenantContext() available inside next()', async () => {
    const { middleware } = makeMiddleware();
    const req: any = makeReq({ authorization: 'Bearer valid' });
    let seenContext: unknown;
    const next = jest.fn(() => {
      seenContext = getTenantContext();
    });

    middleware.use(req, {} as never, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      tenantId: 't1',
      tenantSlug: 'acme',
      schemaName: 'tenant_acme',
      userId: 'u1',
      role: 'admin',
      roleKey: 'admin',
      permissions: new Set(['tenant:settings:read', 'modules:*']),
      enabledFeatures: new Set(['notes']),
      isSuperAdmin: false,
      sessionType: 'tenant',
      impersonatedBy: undefined,
    });
    expect(seenContext).toEqual(req.user);
  });
});

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}
