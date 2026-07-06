import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { CacheService } from '../cache/cache.service';
import { redisConfig, type RedisConfig } from '../config';
import { REDIS_CLIENT, redisClientProvider } from './redis.providers';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: RedisConfig) => {
        const parsed = new URL(redis.url);
        return {
          connection: {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379', 10),
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            db: parsed.pathname
              ? parseInt(parsed.pathname.slice(1), 10)
              : undefined,
          },
        };
      },
    }),
  ],
  providers: [redisClientProvider, CacheService],
  exports: [REDIS_CLIENT, CacheService, BullModule],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
