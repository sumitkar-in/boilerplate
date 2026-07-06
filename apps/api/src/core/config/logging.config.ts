import { registerAs } from '@nestjs/config';

export const loggingConfig = registerAs('logging', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
  observabilityEnabled: process.env.OBSERVABILITY_ENABLED === 'true',
  lokiUrl: process.env.LOKI_URL ?? 'http://localhost:3100',
}));

export type LoggingConfig = ReturnType<typeof loggingConfig>;
