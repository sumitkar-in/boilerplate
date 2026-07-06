import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NOTIFICATIONS_QUEUE } from './jobs/notifications.types';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    // cron providers are registered below this line, one per generated job — see scripts/generators/generate-cron-job.js
  ],
  // Other modules access this module's data through NotificationsService —
  // never by importing entities/ directly. See: skills/nestjs-module/SKILL.md
  exports: [NotificationsService],
})
export class NotificationsModule {}
