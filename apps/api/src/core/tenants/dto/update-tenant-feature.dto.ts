import { IsBoolean, IsString } from 'class-validator';

export class UpdateTenantFeatureDto {
  @IsString()
  featureKey!: string;

  @IsBoolean()
  enabled!: boolean;
}
