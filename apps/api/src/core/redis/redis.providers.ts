import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { redisConfig, type RedisConfig } from '../config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [redisConfig.KEY],
  useFactory: (redis: RedisConfig): Redis => new Redis(redis.url),
};
