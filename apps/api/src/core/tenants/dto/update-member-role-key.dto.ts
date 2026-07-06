import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateMemberRoleKeyDto {
  @ApiProperty({ example: 'sales-manager' })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9][a-z0-9-]*$/)
  roleKey!: string;
}
