import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { Observable, tap } from 'rxjs';
import type { ResolvedTenantIdentity } from '../common/decorators/resolved-tenant.decorator';
import { tenantContextStorage } from '../tenants/tenant-context';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_slug'],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_slug'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
});

/**
 * Route rather than URL as the label — using the raw URL would let each
 * distinct :id blow up cardinality in Prometheus.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const route =
      (req.route as { path?: string } | undefined)?.path ?? req.path;
    const tenantSlug = resolveTenantSlug(req);
    const stop = httpRequestDurationSeconds.startTimer({
      method: req.method,
      route,
      tenant_slug: tenantSlug,
    });

    return next.handle().pipe(
      tap({
        next: () => finish(),
        error: () => finish(),
      }),
    );

    function finish(): void {
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
        tenant_slug: tenantSlug,
      };
      httpRequestsTotal.inc(labels);
      stop(labels);
    }
  }
}

function resolveTenantSlug(req: Request): string {
  const contextTenant = tenantContextStorage.getStore()?.tenantSlug;
  if (contextTenant) return contextTenant;

  const resolvedTenant = (
    req as Request & {
      resolvedTenant?: ResolvedTenantIdentity;
    }
  ).resolvedTenant;
  return resolvedTenant?.tenantSlug ?? 'platform';
}
