import { resolve } from 'node:path';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { appConfig, staticEnv } from './core/config';

// Resolved relative to this file rather than process.cwd() — `pnpm
// --filter api ...` runs with cwd=apps/api, not the repo root, so a bare
// `dotenv/config` (which defaults to `${cwd}/.env`) silently finds nothing.
config({ path: resolve(__dirname, '../../..', '.env') });

function securityHeaders(
  isProduction: boolean,
): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    if (isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: !staticEnv.isProduction,
    // Nest's own bootstrap logs are buffered until app.useLogger() swaps
    // in nestjs-pino below, so nothing is lost or double-logged.
    bufferLogs: true,
  });
  const config = app.get<ReturnType<typeof appConfig>>(appConfig.KEY);
  app.useLogger(app.get(Logger));
  app.use(securityHeaders(config.isProduction));
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'docs',
      'docs-json',
      'metrics',
      'nestlens',
      'nestlens/{*splat}',
      '__nestlens__/{*splat}',
    ],
  });
  // The web app (apps/web, Vite dev server) is a separate origin — without
  // this every browser fetch() to the API is blocked by CORS preflight.
  app.enableCors({
    origin: config.corsOrigin,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!config.isProduction || config.apiDocsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Boilerplate API')
      .setDescription('Multi-tenant modular boilerplate API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-tenant-id',
          in: 'header',
          // Despite the header name (kept for backwards compatibility),
          // tenant-resolver.middleware.ts resolves by slug only
          // (TenantsService.findBySlug) — passing a tenant UUID here will
          // not resolve.
          description:
            'Tenant slug used to resolve the current tenant (not the tenant id, despite the header name)',
        },
        'tenant',
      )
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs-json',
    });
  }

  await app.listen(config.port);
}
void bootstrap();
