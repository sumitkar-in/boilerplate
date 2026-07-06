import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { TENANT_ROLE_KEYS, type TenantRole } from '@boilerplate/contracts';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: TENANT_ROLE_KEYS, example: 'member' })
  @IsIn(TENANT_ROLE_KEYS)
  role!: TenantRole;
}
