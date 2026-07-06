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

export const LIST_FILTER_OPERATORS = [
  'contains',
  'startsWith',
  'endsWith',
  'equals',
  'notEquals',
  'notContains',
  'blank',
  'notBlank',
  // Internal-only: value is a list of allowed values joined with the
  // unit separator character (U+001F). Backs AdvancedDataTable's "select
  // specific values" column filter menu — never surfaced as a
  // user-facing "Match" operator.
  'in',
] as const;

export type ListFilterOperator = (typeof LIST_FILTER_OPERATORS)[number];

export class ListFilterDto {
  @ApiPropertyOptional({
    description: 'Field key, or "custom:<fieldKey>" for a custom field',
  })
  @IsString()
  @MaxLength(128)
  field!: string;

  @ApiPropertyOptional({ enum: LIST_FILTER_OPERATORS })
  @IsIn(LIST_FILTER_OPERATORS)
  operator!: ListFilterOperator;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  value?: string;
}

/**
 * Generic list query shared by every module's list endpoint: free-text
 * search, structured per-field filters, sorting, and pagination. Extend it
 * per module for extra params (see QueryEmployeesDto) and feed it to
 * buildListConditions()/buildListOrderBy() in the service.
 */
export class ListQueryDto {
  @ApiPropertyOptional({
    description: 'Free-text search across the module-defined search fields',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description: 'Field key to sort by (supports "custom:<fieldKey>")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

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

  @ApiPropertyOptional({
    description:
      'JSON-encoded array of filters, e.g. [{"field":"name","operator":"contains","value":"ada"}]',
    type: String,
  })
  @IsOptional()
  // Query strings arrive as text — parse here so nested validation runs on
  // the array. On malformed JSON we keep the raw string so @IsArray rejects
  // it with a 400 instead of a 500 from an uncaught parse error.
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
  @Type(() => ListFilterDto)
  filters?: ListFilterDto[];
}
