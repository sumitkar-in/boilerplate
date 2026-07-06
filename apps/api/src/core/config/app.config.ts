import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Boilerplate',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 3000),
  // Origin of the web app (apps/web) — required for CORS in real
  // deployments; the fallback matches the Vite dev server.
  corsOrigin: process.env.WEB_URL ?? 'http://localhost:5173',
  apiDocsEnabled: process.env.API_DOCS_ENABLED === 'true',
}));

export type AppConfig = ReturnType<typeof appConfig>;
