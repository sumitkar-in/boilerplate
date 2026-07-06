import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { QueryBpqlRowsDto } from './query-bpql-rows.dto';

export class RunBpqlQueryDto extends QueryBpqlRowsDto {
  @ApiProperty({ example: 'website-leads' })
  @IsString()
  @MaxLength(80)
  table!: string;

  @ApiPropertyOptional({
    description: 'Reserved human-readable query label for future BPQL syntax.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}
