import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  EMPLOYEE_CUSTOM_FIELD_TYPES,
  type EmployeeCustomFieldType,
} from '../entities/employee-custom-field';

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'Location' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_CUSTOM_FIELD_TYPES, default: 'text' })
  @IsOptional()
  @IsIn(EMPLOYEE_CUSTOM_FIELD_TYPES)
  type?: EmployeeCustomFieldType;

  @ApiPropertyOptional({
    type: [String],
    description: 'Allowed values for select fields',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  options?: string[];
}
