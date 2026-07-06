import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  enabled: process.env.AI_ENABLED === 'true',
  // Base URL of the Python knowledge-bot service (apps/ai) — see its README.
  serviceUrl: (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(
    /\/+$/,
    '',
  ),
}));

export type AiConfig = ReturnType<typeof aiConfig>;
