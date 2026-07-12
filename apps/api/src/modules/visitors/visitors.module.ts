import { Module } from '@nestjs/common';
import { VisitorController } from './visitors.controller';
import { VisitorService } from './visitors.service';

@Module({
  controllers: [VisitorController],
  providers: [VisitorService],
  exports: [VisitorService],
})
export class VisitorModule {}
