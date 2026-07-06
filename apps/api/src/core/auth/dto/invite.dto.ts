import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';
import { TENANT_ROLE_KEYS, type TenantRole } from '@boilerplate/contracts';

export class InviteDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: TENANT_ROLE_KEYS, example: 'member' })
  @IsIn(TENANT_ROLE_KEYS)
  role!: TenantRole;
}
