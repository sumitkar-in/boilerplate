import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../audit-log.service';
import { getTenantContext } from '../../tenants/tenant-context';
import type { Request } from 'express';

/**
 * Intercepts all state-mutating HTTP requests (POST, PUT, PATCH, DELETE)
 * and records them to the AuditLogService for SOC 2 compliance.
 * Runs after authentication and authorization, so req.user is populated.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<
      Request & { user?: { id?: string; tenantId?: string } }
    >();
    const method = req.method.toUpperCase();

    // Only log mutations (ignoring GET/OPTIONS/HEAD)
    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => this.logAction(req, 'success'),
        error: (err: unknown) =>
          this.logAction(
            req,
            `error: ${err instanceof Error ? err.message : String(err)}`,
          ),
      }),
    );
  }

  private logAction(
    req: Request & {
      user?: { id?: string; tenantId?: string };
      route?: { path?: string };
    },
    status: string,
  ) {
    // Attempt to get tenantId from context, fallback to req.user's tenant
    let tenantId: string | null = null;
    try {
      const tc = getTenantContext();
      tenantId = tc.tenantId;
    } catch {
      tenantId = req.user?.tenantId || null;
    }

    const userId = req.user?.id;
    // Don't log if we can't identify the user (e.g. public login route),
    // though auth service already logs login events.
    if (!userId) return;

    // Redact sensitive payload fields
    const body = req.body ? { ...(req.body as Record<string, unknown>) } : {};
    if (body.password) body.password = '[REDACTED]';
    if (body.token) body.token = '[REDACTED]';
    if (body.refreshToken) body.refreshToken = '[REDACTED]';

    const route = req.route as { path?: string } | undefined;
    const action = `${req.method} ${route?.path || req.path}`;

    // Background fire-and-forget
    this.auditLogService
      .log({
        tenantId,
        userId,
        action,
        metadata: {
          status,
          ip: req.ip,
          body,
        },
      })
      .catch((err) => {
        // Fallback to console if DB insert fails so we don't crash the request
        console.error('Failed to write audit log:', err);
      });
  }
}
