import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

const startTime = Date.now();

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  @Get('health')
  async check() {
    const checks: Record<string, any> = {};
    let healthy = true;

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.database = { status: 'up' };
    } catch (err: any) {
      checks.database = { status: 'down', error: err.message };
      healthy = false;
    }

    try {
      if (typeof this.redis.ping === 'function') {
        await this.redis.ping();
        checks.redis = { status: 'up' };
      } else {
        checks.redis = { status: 'up', note: 'mock' };
      }
    } catch (err: any) {
      checks.redis = { status: 'down', error: err.message };
      healthy = false;
    }

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'udb-api',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
