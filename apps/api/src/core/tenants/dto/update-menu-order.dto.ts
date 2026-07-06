import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CustomMenuItemDto {
  @ApiProperty({
    description: 'The original module key or a generated ID for custom folders',
  })
  @IsString()
  @MaxLength(120)
  id!: string;

  @ApiProperty({ required: false, description: 'Custom label' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  label?: string;

  @ApiProperty({ required: false, description: 'Custom icon' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false, description: 'Hidden state' })
  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @ApiProperty({ required: false, type: [CustomMenuItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CustomMenuItemDto)
  @IsOptional()
  children?: CustomMenuItemDto[];
}

export class UpdateMenuOrderDto {
  @ApiProperty({
    type: [CustomMenuItemDto],
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CustomMenuItemDto)
  itemOrder!: CustomMenuItemDto[];
}
