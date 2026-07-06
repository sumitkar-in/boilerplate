import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BpqlFieldDto } from './bpql-field.dto';

export class CreateBpqlTableDto {
  @ApiProperty({ example: 'Website Leads' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'website-leads' })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'slug must use lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [BpqlFieldDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BpqlFieldDto)
  fields!: BpqlFieldDto[];
}
