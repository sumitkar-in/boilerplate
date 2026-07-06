import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BPQL_AGG_FUNCTIONS,
  BPQL_CHART_PLACEMENTS,
  BPQL_CHART_TYPES,
  type BpqlAggFunction,
  type BpqlChartPlacement,
  type BpqlChartType,
} from '../entities/bpql-chart';
import { BpqlWhereDto } from './query-bpql-rows.dto';

export class CreateBpqlChartDto {
  @ApiProperty({ example: 'website-leads' })
  @IsString()
  @MaxLength(80)
  table!: string;

  @ApiPropertyOptional({
    description:
      "Reuse an existing saved query for filters — its search/where take precedence over this chart's own search/where when set.",
  })
  @IsOptional()
  @IsUUID()
  savedQueryId?: string;

  @ApiProperty({ example: 'Deals by region' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: BPQL_CHART_TYPES })
  @IsIn(BPQL_CHART_TYPES)
  chartType!: BpqlChartType;

  @ApiPropertyOptional({
    description:
      'Field to group by (x-axis/pie-slice). Omit for a single-number KPI card.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupByField?: string;

  @ApiPropertyOptional({
    description: 'Required unless aggFunction is "count".',
  })
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

  @ApiPropertyOptional({ enum: BPQL_CHART_PLACEMENTS, default: 'bpql' })
  @IsOptional()
  @IsIn(BPQL_CHART_PLACEMENTS)
  placement?: BpqlChartPlacement;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;
}
