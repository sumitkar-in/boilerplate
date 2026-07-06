import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => {
  const endpoint = process.env.S3_ENDPOINT;
  return {
    driver: (process.env.STORAGE_DRIVER as 'local' | 's3') || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || 'uploads',
    // Base URL used to build public links for locally stored files.
    publicBaseUrl: process.env.WEB_URL || 'http://localhost:3000',
    presignTtlSeconds: 3600,
    s3: {
      bucket: process.env.S3_BUCKET || 'app-uploads',
      endpoint,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      // Path-style is what MinIO (and most self-hosted S3) require;
      // virtual-hosted style only makes sense against real AWS.
      forcePathStyle:
        process.env.S3_FORCE_PATH_STYLE !== 'false' &&
        (!!endpoint || process.env.MINIO_ENABLED === 'true'),
    },
  };
});

export type StorageConfig = ReturnType<typeof storageConfig>;
