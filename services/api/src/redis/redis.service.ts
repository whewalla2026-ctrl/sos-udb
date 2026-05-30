import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, mode: string, ttl: number): Promise<'OK'> {
    return this.client.set(key, value, mode as any, ttl);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value);
  }

  async publish(channel: string, message: any): Promise<number> {
    return this.client.publish(channel, JSON.stringify(message));
  }

  getClient(): Redis {
    return this.client;
  }
}