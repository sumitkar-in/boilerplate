import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { TransportTargetOptions } from 'pino';
import {
  appConfig,
  loggingConfig,
  type AppConfig,
  type LoggingConfig,
} from '../config';

/**
 * Fans out to stdout always (pretty-printed outside production, plain
 * JSON in it) and additionally to Loki when OBSERVABILITY_ENABLED=true —
 * see infra/docker/docker-compose.yml's `observability` profile and
 * README "Observability". Loki is unreachable with the stack off, but
 * pino-loki batches/retries in a worker thread rather than throwing, so
 * this is safe to leave pointed at LOKI_URL either way.
 */
function buildTransportTargets(
  logging: LoggingConfig,
  app: AppConfig,
): TransportTargetOptions[] {
  const targets: TransportTargetOptions[] = [
    app.nodeEnv === 'production'
      ? {
          target: 'pino/file',
          options: { destination: 1 },
          level: logging.level,
        }
      : {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true },
          level: logging.level,
        },
  ];

  if (logging.observabilityEnabled) {
    targets.push({
      target: 'pino-loki',
      level: logging.level,
      options: {
        host: logging.lokiUrl,
        batching: true,
        interval: 5,
        labels: { app: 'api', env: app.nodeEnv },
      },
    });
  }

  return targets;
}

/**
 * Structured request/app logging via pino, replacing Nest's default
 * console logger app-wide (see app.useLogger(app.get(Logger)) in
 * main.ts). LoggerModule.forRoot() is global by default, so any provider
 * can inject nestjs-pino's Logger/InjectPinoLogger without importing this
 * module directly.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [loggingConfig.KEY, appConfig.KEY],
      useFactory: (logging: LoggingConfig, app: AppConfig) => ({
        pinoHttp: {
          level: logging.level,
          base: { service: 'api', env: app.nodeEnv },
          genReqId: (req) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.token',
            '*.refreshToken',
          ],
          autoLogging: { ignore: (req) => req.url === '/metrics' },
          transport: { targets: buildTransportTargets(logging, app) },
        },
      }),
    }),
  ],
})
export class LoggingModule {}
