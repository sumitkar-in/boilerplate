import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { collectDefaultMetrics } from 'prom-client';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

// Runs once per process (module-load side effect, not per Nest module
// instantiation) — safe even if the app is bootstrapped multiple times
// within one process, e.g. across e2e specs that share a Jest worker.
collectDefaultMetrics();

/**
 * Only imported when OBSERVABILITY_ENABLED=true (see app.module.ts).
 * Exposes GET /metrics for Prometheus to scrape (infra/docker/prometheus/
 * prometheus.yml, `observability` compose profile) and records
 * per-request count/duration via MetricsInterceptor.
 */
@Module({
  controllers: [MetricsController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
})
export class MetricsModule {}
