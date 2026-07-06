import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const STATUSES = ['active', 'suspended'] as const;

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: STATUSES, example: 'active' })
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}
