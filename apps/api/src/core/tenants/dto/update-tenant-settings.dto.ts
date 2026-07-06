import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export type TenantDashboardWidgetKey =
  'tenant' | 'role' | 'modules' | 'quickLinks' | 'activity';

export type TenantSettingsPayload = {
  general?: {
    timezone?: string;
    locale?: string;
    dateFormat?: string;
    currency?: string;
    weekStartsOn?: string;
  };
  dashboard?: {
    title?: string;
    subtitle?: string;
    defaultRange?: string;
    widgets?: TenantDashboardWidgetKey[];
    quickLinkLimit?: number;
  };
  navigation?: {
    defaultCollapsed?: boolean;
    moduleGrouping?: 'category' | 'flat';
    showSearch?: boolean;
  };
  notifications?: {
    fromEmail?: string;
    digestFrequency?: string;
    enableInApp?: boolean;
    enableEmail?: boolean;
  };
  security?: {
    requireTwoFactor?: boolean;
    sessionTimeoutMinutes?: number;
    allowedDomains?: string[];
  };
  integrations?: {
    webhookUrl?: string;
    supportEmail?: string;
    aiModel?: string;
  };
  data?: {
    retentionDays?: number;
    exportFormat?: string;
  };
};

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ example: 'Demo Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @ApiPropertyOptional({ example: '#35abc0' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  brandColor?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.svg',
    description:
      'Logo URL or data URL. File upload can be added later via storage.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  logoUrl?: string;

  @ApiPropertyOptional({
    description:
      'Tenant-level settings for dashboard, navigation, locale, notifications, security, integrations, and data retention.',
  })
  @IsOptional()
  @IsObject()
  settings?: TenantSettingsPayload;
}
