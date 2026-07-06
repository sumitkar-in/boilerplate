import { Module } from '@nestjs/common';
import { {{FeatureName}}Controller } from './{{featureKey}}.controller';
import { {{FeatureName}}Service } from './{{featureKey}}.service';

@Module({
  controllers: [{{FeatureName}}Controller],
  providers: [
    {{FeatureName}}Service,
    // cron providers are registered below this line, one per generated job — see scripts/generators/generate-cron-job.js
  ],
  // Other modules access this module's data through {{FeatureName}}Service —
  // never by importing entities/ directly. See: skills/nestjs-module/SKILL.md
  exports: [{{FeatureName}}Service],
})
export class {{FeatureName}}Module {}
