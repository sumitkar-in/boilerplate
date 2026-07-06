import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { BPQL_FIELD_TYPES, type BpqlFieldType } from '../entities/bpql-table';

export class BpqlFieldDto {
  @ApiProperty({ example: 'companyName' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-zA-Z0-9]*$/, {
    message: 'key must be camelCase and start with a lowercase letter',
  })
  key!: string;

  @ApiProperty({ example: 'Company name' })
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ enum: BPQL_FIELD_TYPES })
  @IsIn(BPQL_FIELD_TYPES)
  type!: BpqlFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  options?: string[];
}
