import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BPQL_AGG_FUNCTIONS,
  type BpqlAggFunction,
} from '../entities/bpql-chart';
import { BpqlWhereDto } from './query-bpql-rows.dto';

/** Ad hoc group-by/aggregate execution — used for live chart-builder previews before saving. */
export class RunBpqlAggregateQueryDto {
  @ApiProperty({ example: 'website-leads' })
  @IsString()
  @MaxLength(80)
  table!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupByField?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  metricField?: string;

  @ApiProperty({ enum: BPQL_AGG_FUNCTIONS, default: 'count' })
  @IsIn(BPQL_AGG_FUNCTIONS)
  aggFunction!: BpqlAggFunction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ type: [BpqlWhereDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BpqlWhereDto)
  where?: BpqlWhereDto[];

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  groupLimit?: number;
}
