import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MEMBER_SORT_FIELDS = [
  'email',
  'fullName',
  'role',
  'status',
] as const;
export type MemberSortField = (typeof MEMBER_SORT_FIELDS)[number];

export class QueryMembersDto {
  @ApiPropertyOptional({
    description: 'Free-text search across member email and name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: ['invited', 'active'] })
  @IsOptional()
  @IsIn(['invited', 'active'])
  status?: 'invited' | 'active';

  @ApiPropertyOptional({ enum: MEMBER_SORT_FIELDS })
  @IsOptional()
  @IsIn(MEMBER_SORT_FIELDS)
  sortBy?: MemberSortField;

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
}
