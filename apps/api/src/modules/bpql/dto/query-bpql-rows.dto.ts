import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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

export const BPQL_OPERATORS = [
  'equals',
  'notEquals',
  'contains',
  'blank',
  'notBlank',
  'greaterThan',
  'greaterOrEqual',
  'lessThan',
  'lessOrEqual',
] as const;

export type BpqlOperator = (typeof BPQL_OPERATORS)[number];

export class BpqlWhereDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(64)
  field!: string;

  @ApiPropertyOptional({ enum: BPQL_OPERATORS })
  @IsIn(BPQL_OPERATORS)
  operator!: BpqlOperator;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  value?: string;
}

export class QueryBpqlRowsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description: 'JSON-encoded BPQL where array',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BpqlWhereDto)
  where?: BpqlWhereDto[];

  @ApiPropertyOptional({ default: 50, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
