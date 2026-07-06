import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { TENANT_ROLE_KEYS, type TenantRole } from '@boilerplate/contracts';

export class CreateTenantUserDto {
  @ApiProperty({ example: 'user@acme.test' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({ enum: TENANT_ROLE_KEYS })
  @IsIn(TENANT_ROLE_KEYS)
  role!: TenantRole;

  @ApiPropertyOptional({
    description:
      'If omitted, the API generates a temporary password and returns it once.',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  password?: string;
}
