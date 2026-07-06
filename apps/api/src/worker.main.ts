import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

// Same cwd-independent .env resolution as main.ts.
config({ path: resolve(__dirname, '../../..', '.env') });

// Headless Nest application context: no HTTP server, just the BullMQ
// consumers registered in WorkerModule. Run with `pnpm --filter api
// start:worker` (or the docker "worker" service).
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
}
void bootstrap();
