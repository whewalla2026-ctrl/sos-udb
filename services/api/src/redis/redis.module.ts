import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // In test environments, avoid depending on a real Redis instance.
        if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REAL_REDIS === 'true') {
          return { publish: async (...args: any[]) => 1 } as any;
        }
        const client = new Redis(config.get<string>('REDIS_URL') || 'redis://localhost:6379');
        client.on('connect', () => console.log('✅ Redis connected'));
        client.on('error', (err) => console.error('❌ Redis error:', err));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
