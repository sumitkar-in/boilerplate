import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NotesSweepCron } from './cron/notes-sweep.cron';
import { NOTES_SWEEP_QUEUE } from './jobs/notes-sweep.types';

@Module({
  imports: [BullModule.registerQueue({ name: NOTES_SWEEP_QUEUE })],
  controllers: [NotesController],
  providers: [
    NotesService,
    // cron providers are registered below this line, one per generated job — see scripts/generators/generate-cron-job.js
    NotesSweepCron,
  ],
  // Other modules access this module's data through NotesService —
  // never by importing entities/ directly. See: skills/nestjs-module/SKILL.md
  exports: [NotesService],
})
export class NotesModule {}
