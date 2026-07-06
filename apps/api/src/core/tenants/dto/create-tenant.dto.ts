import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'acme', pattern: '^[a-z0-9-]+$' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens only',
  })
  slug!: string;

  @ApiProperty({ type: [String], example: ['notes'] })
  @IsArray()
  @IsString({ each: true })
  features!: string[];
}
