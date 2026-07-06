import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { configLoaders, validateEnv } from './core/config';
import { DatabaseModule } from './core/database/database.module';
import { FeatureFlagsModule } from './core/feature-flags/feature-flags.module';
import { LoggingModule } from './core/logging/logging.module';
import { RedisModule } from './core/redis/redis.module';
import { StorageModule } from './core/storage/storage.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { EmployeeCsvProcessor } from './modules/employees/jobs/employee-csv.processor';
import { EMPLOYEE_CSV_QUEUE } from './modules/employees/jobs/employee-csv.types';
import { NotesSweepProcessor } from './modules/notes/jobs/notes-sweep.processor';
import { NOTES_SWEEP_QUEUE } from './modules/notes/jobs/notes-sweep.types';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationsProcessor } from './modules/notifications/jobs/notifications.processor';
import { NOTIFICATIONS_QUEUE } from './modules/notifications/jobs/notifications.types';

/**
 * Root module of the background worker process (worker.main.ts / the
 * docker "worker" service). Registers the queue consumers that must NOT
 * run inside the API process — heavy jobs like CSV export/import — while
 * reusing the same feature-module services the API uses.
 *
 * Add future processors here (one per heavy queue), never to the feature
 * module itself, so the API stays a pure producer.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      validate: validateEnv,
      load: configLoaders,
    }),
    FeatureFlagsModule,
    LoggingModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    DepartmentsModule,
    EmployeesModule,
    NotificationsModule,
    BullModule.registerQueue({ name: EMPLOYEE_CSV_QUEUE }),
    BullModule.registerQueue({ name: NOTES_SWEEP_QUEUE }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [
    EmployeeCsvProcessor,
    NotesSweepProcessor,
    NotificationsProcessor,
  ],
})
export class WorkerModule {}
