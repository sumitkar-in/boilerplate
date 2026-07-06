import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DOCUMENT_FORMATS,
  type DocumentFormat,
} from '../entities/document-page';

export class CreatePageDto {
  @ApiProperty()
  @IsUUID()
  spaceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({ example: 'Runbook' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ enum: DOCUMENT_FORMATS, default: 'markdown' })
  @IsOptional()
  @IsIn(DOCUMENT_FORMATS)
  format?: DocumentFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  labels?: string[];
}
