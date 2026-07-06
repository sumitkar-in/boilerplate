import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/**
 * Whole-process env contract, enforced once at bootstrap via
 * ConfigModule.forRoot({ validate }). Every variable the API or worker
 * reads must be declared here — the namespaced config files under this
 * directory are the only other place allowed to touch process.env.
 *
 * Defaults here mirror .env.example; keep the two in sync.
 */
export class EnvSchema {
  @IsIn(['development', 'test', 'production'])
  @IsOptional()
  NODE_ENV = 'development';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  PORT = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  // A missing secret falls back to a dev-only value with a logged warning;
  // in production that fallback would silently sign every session, so the
  // process refuses to start instead.
  @ValidateIf((env: EnvSchema) => env.NODE_ENV === 'production')
  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET must be set to a value of at least 32 characters in production',
  })
  JWT_SECRET?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  ACCESS_TOKEN_TTL_SECONDS = 900;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  REFRESH_TOKEN_TTL_DAYS = 30;

  @IsString()
  @IsOptional()
  TENANT_BASE_DOMAIN?: string;

  @ValidateIf(
    (env: EnvSchema) =>
      env.NODE_ENV === 'production' || env.WEB_URL !== undefined,
  )
  @IsUrl(
    { require_tld: false, require_protocol: true },
    { message: 'WEB_URL must be a full URL and is required in production' },
  )
  WEB_URL?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  API_DOCS_ENABLED = 'false';

  @IsIn(['true', 'false'])
  @IsOptional()
  NESTLENS_ENABLED = 'true';

  @IsString()
  @IsOptional()
  APP_NAME = 'Boilerplate';

  @IsIn(['local', 's3'])
  @IsOptional()
  STORAGE_DRIVER = 'local';

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_PATH = 'uploads';

  @IsString()
  @IsOptional()
  S3_BUCKET = 'app-uploads';

  @IsString()
  @IsOptional()
  S3_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  S3_REGION = 'us-east-1';

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  S3_SECRET_KEY?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  S3_FORCE_PATH_STYLE?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  MINIO_ENABLED?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  OBSERVABILITY_ENABLED?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  AI_ENABLED?: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  AI_SERVICE_URL?: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  OLLAMA_BASE_URL?: string;

  @IsString()
  @IsOptional()
  OLLAMA_MODEL = 'qwen3:0.6b';

  @IsString()
  @IsOptional()
  LOG_LEVEL = 'info';

  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  LOKI_URL?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_OVERRIDE?: number;
}

export function validateEnv(env: Record<string, unknown>): EnvSchema {
  const parsed = plainToInstance(EnvSchema, env, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });
  const errors = validateSync(parsed, {
    whitelist: false,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    const details = errors
      .map((err) => Object.values(err.constraints ?? {}).join('; '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }
  return parsed;
}
