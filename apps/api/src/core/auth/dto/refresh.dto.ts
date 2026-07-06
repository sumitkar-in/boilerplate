import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// Shared by /auth/refresh and /auth/logout — both just take a refresh token.
export class RefreshDto {
  @ApiProperty({ example: 'refresh-token' })
  @IsString()
  refreshToken!: string;
}
