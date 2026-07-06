import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeExecutionContext(
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    getHandler: () => ({}) as unknown,
    getClass: () => ({}) as unknown,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('allows a @Public() route regardless of request.user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = makeExecutionContext({});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a protected route when AuthContextMiddleware set request.user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = makeExecutionContext({ user: { userId: 'u1' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a protected route with no request.user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = makeExecutionContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
