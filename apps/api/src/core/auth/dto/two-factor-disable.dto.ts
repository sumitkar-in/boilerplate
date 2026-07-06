import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TwoFactorDisableDto {
  @ApiProperty({ example: 'password' })
  @IsString()
  password!: string;
}
