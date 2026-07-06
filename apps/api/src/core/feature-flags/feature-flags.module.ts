import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagGuard } from './feature-flag.guard';

/**
 * FeatureFlagsService and FeatureFlagGuard are used by every feature
 * module, so this is @Global() and imported once in AppModule — feature
 * modules just inject FeatureFlagsService or apply @RequireFeature()
 * without importing this module themselves. See: skills/feature-flags/SKILL.md
 */
@Global()
@Module({
  providers: [FeatureFlagsService, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
