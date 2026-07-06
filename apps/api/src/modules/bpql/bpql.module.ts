import { Module } from '@nestjs/common';
import { BpqlController } from './bpql.controller';
import { BpqlService } from './bpql.service';

@Module({
  controllers: [BpqlController],
  providers: [BpqlService],
  exports: [BpqlService],
})
export class BpqlModule {}
