import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVisitorDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'person@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDate()
  @Type(() => Date)
  entryTime!: Date;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  exitTime?: Date;
}
