import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import type { BpqlRowData } from '../entities/bpql-row';

export class BpqlRowDto {
  @ApiProperty({
    example: { companyName: 'Acme Inc', value: 12000, active: true },
  })
  @IsObject()
  data!: BpqlRowData;
}
