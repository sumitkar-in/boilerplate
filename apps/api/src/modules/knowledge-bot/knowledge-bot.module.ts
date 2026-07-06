import { Module } from '@nestjs/common';
import { KnowledgeBotController } from './knowledge-bot.controller';
import { KnowledgeBotService } from './knowledge-bot.service';

@Module({
  controllers: [KnowledgeBotController],
  providers: [KnowledgeBotService],
  exports: [KnowledgeBotService],
})
export class KnowledgeBotModule {}
