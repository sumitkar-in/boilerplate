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
  TASK_CUSTOM_FIELD_TYPES,
  type TaskCustomFieldType,
} from '../entities/task-custom-field';

export class CreateTaskCustomFieldDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ example: 'Sprint' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({ enum: TASK_CUSTOM_FIELD_TYPES, default: 'text' })
  @IsOptional()
  @IsIn(TASK_CUSTOM_FIELD_TYPES)
  type?: TaskCustomFieldType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  options?: string[];
}
