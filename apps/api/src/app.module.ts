import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { NestLensModule } from 'nestlens';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { PostgresExceptionFilter } from './core/common/filters/postgres-exception.filter';
import { AuditLogInterceptor } from './core/common/interceptors/audit-log.interceptor';
import { AuditLogService } from './core/common/audit-log.service';
import {
  canAccessNestLens,
  configLoaders,
  staticEnv,
  validateEnv,
  EnvSchema,
} from './core/config';
import { DatabaseModule } from './core/database/database.module';
import { FeatureFlagsModule } from './core/feature-flags/feature-flags.module';
import { LoggingModule } from './core/logging/logging.module';
import { MetricsModule } from './core/metrics/metrics.module';
import { RedisModule } from './core/redis/redis.module';
import { StorageModule } from './core/storage/storage.module';
import { SchedulingModule } from './core/scheduling/scheduling.module';
import { TenantsModule } from './core/tenants/tenants.module';
import { UsersModule } from './core/users/users.module';
import { NotesModule } from './modules/notes/notes.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BpqlModule } from './modules/bpql/bpql.module';
import { KnowledgeBotModule } from './modules/knowledge-bot/knowledge-bot.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { VisitorModule } from './modules/visitors/visitors.module';
// Toggles the Prometheus /metrics endpoint and its collection
// interceptor — leave off unless the `observability` compose profile
// (infra/docker/docker-compose.yml) is actually running. See README
// "Observability".
// These gate conditional module imports, which are evaluated before Nest
// DI exists — hence staticEnv rather than ConfigService.
const observabilityEnabled = staticEnv.observabilityEnabled;
const devtoolsEnabled =
  !staticEnv.isProduction && !staticEnv.isTest && !staticEnv.isJest;
const nestLensEnabled =
  !staticEnv.isProduction &&
  !staticEnv.isJest &&
  process.env.NESTLENS_ENABLED !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env is loaded by main.ts/worker.main.ts (cwd-independent path);
      // ConfigModule only validates and namespaces what's in process.env.
      ignoreEnvFile: true,
      validate: validateEnv,
      load: configLoaders,
    }),
    // Keep devtools out of Jest entirely. Registering it with `http: false`
    // still starts delayed sandbox-token logging, which can fire after Jest
    // tears down the test environment.
    ...(devtoolsEnabled ? [DevtoolsModule.register({ http: true })] : []),
    NestLensModule.forRoot({
      enabled: nestLensEnabled,
      authorization: {
        allowedEnvironments: ['development', 'local', 'test'],
        canAccess: canAccessNestLens,
        requiredRoles: ['super-admin'],
      },
      rateLimit: { windowMs: 60_000, maxRequests: 60 },
      security: {
        stackTraceSanitization: 'partial',
      },
      watchers: {
        request: {
          enabled: true,
          captureHeaders: false,
          captureBody: false,
          captureResponse: false,
          captureUser: false,
          captureSession: false,
        },
        exception: true,
        log: true,
        query: true,
      },
    }),
    LoggingModule,
    ...(observabilityEnabled ? [MetricsModule] : []),
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvSchema, true>) => [
        {
          ttl: 60000,
          limit: config.get('THROTTLE_LIMIT_OVERRIDE', { infer: true }) ?? 10,
        },
      ],
    }),
    StorageModule,
    FeatureFlagsModule,
    SchedulingModule,
    UsersModule,
    TenantsModule,
    AuthModule,
    // feature modules are registered below this line, one per generated module — see scripts/generators/generate-module.js
    VisitorModule,
    NotificationsModule,
    DepartmentsModule,
    EmployeesModule,
    NotesModule,
    TasksModule,
    DocumentsModule,
    BpqlModule,
    KnowledgeBotModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    // Translates Postgres constraint errors (unique/fk/check) into
    // 409/400 responses app-wide — see core/common/filters.
    { provide: APP_FILTER, useClass: PostgresExceptionFilter },
  ],
})
export class AppModule {}
