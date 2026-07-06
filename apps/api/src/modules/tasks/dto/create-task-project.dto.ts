import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTaskProjectDto {
  @ApiProperty({ example: 'Website Services' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'WS' })
  @IsString()
  @MaxLength(12)
  @Matches(/^[A-Z][A-Z0-9]*$/, {
    message:
      'code must use uppercase letters and numbers, starting with a letter',
  })
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
