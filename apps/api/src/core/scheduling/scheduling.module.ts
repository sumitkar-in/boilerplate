import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantSweepService } from './tenant-sweep.service';

/**
 * Wires up @nestjs/schedule's ScheduleModule.forRoot() — so any module's
 * @Cron() decorators actually fire — and exposes TenantSweepService for
 * any module's cron fan-out. @Global() + imported once in AppModule, the
 * same way FeatureFlagsModule is. See: skills/cron-jobs/SKILL.md
 */
@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TenantSweepService],
  exports: [TenantSweepService],
})
export class SchedulingModule {}
