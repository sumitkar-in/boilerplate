import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TwoFactorVerifyLoginDto {
  @ApiProperty({ example: 'partial-login-token' })
  @IsString()
  partialToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;
}
