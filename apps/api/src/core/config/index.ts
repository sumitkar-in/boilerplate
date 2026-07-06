import { aiConfig } from './ai.config';
import { appConfig } from './app.config';
import { authConfig } from './auth.config';
import { databaseConfig } from './database.config';
import { loggingConfig } from './logging.config';
import { redisConfig } from './redis.config';
import { storageConfig } from './storage.config';
import { tenantConfig } from './tenant.config';

export * from './ai.config';
export * from './app.config';
export * from './auth.config';
export * from './database.config';
export * from './logging.config';
export * from './nestlens-access';
export * from './redis.config';
export * from './storage.config';
export * from './tenant.config';
export * from './env.validation';
export * from './static-env';

/** Every namespaced config, for ConfigModule.forRoot({ load }). */
export const configLoaders = [
  aiConfig,
  appConfig,
  authConfig,
  databaseConfig,
  loggingConfig,
  redisConfig,
  storageConfig,
  tenantConfig,
];
