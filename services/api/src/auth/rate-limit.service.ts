import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';
import { Request } from 'express';

export interface RateLimitConfig {
  ttl: number;
  limit: number;
}

@Injectable()
export class GranularRateLimitService {
  private readonly defaultLimits: Map<string, RateLimitConfig> = new Map([
    ['auth.register', { ttl: 60 * 1000, limit: 10 }],
    ['auth.login', { ttl: 60 * 1000, limit: 10 }],
    ['graphql.mutation', { ttl: 60 * 1000, limit: 60 }],
    ['graphql.query', { ttl: 60 * 1000, limit: 120 }],
    ['file.upload', { ttl: 60 * 1000, limit: 10 }],
    ['webhook.stripe', { ttl: 60 * 1000, limit: 999999 }],
    ['default', { ttl: 60 * 1000, limit: 600 }],
  ]);

  private readonly userLimits: Map<string, RateLimitConfig> = new Map([
    ['graphql.mutation', { ttl: 60 * 1000, limit: 60 }],
    ['file.upload', { ttl: 60 * 1000, limit: 10 }],
  ]);

  getRateLimitConfig(route: string, userId?: string): RateLimitConfig {
    const config = this.defaultLimits.get(route) || this.defaultLimits.get('default');
    return config!;
  }

  getUserRateLimitConfig(route: string): RateLimitConfig | null {
    return this.userLimits.get(route) || null;
  }

  isAuthEndpoint(path: string): boolean {
    return path.includes('/auth/');
  }

  isWebhookEndpoint(path: string): boolean {
    return path.includes('/webhook/');
  }

  isFileUploadEndpoint(path: string): boolean {
    return path.includes('/upload') || path.includes('/file');
  }

  getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  formatRateLimitKey(req: Request, route: string, userId?: string): string {
    const ip = this.getClientIp(req);

    if (this.isAuthEndpoint(route)) {
      return `ratelimit:auth:${ip}:${route}`;
    }

    if (userId) {
      return `ratelimit:user:${userId}:${route}`;
    }

    return `ratelimit:ip:${ip}:${route}`;
  }

  getThrottlerOptions(): ThrottlerOptions[] {
    return [
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
        keyGenerator: (req: Request) => this.getClientIp(req),
      },
      {
        name: 'graphql-mutation',
        ttl: 60000,
        limit: 60,
        keyGenerator: (req: Request) => {
          const user = (req as any).user;
          return user?.id || this.getClientIp(req);
        },
      },
      {
        name: 'graphql-query',
        ttl: 60000,
        limit: 120,
        keyGenerator: (req: Request) => {
          const user = (req as any).user;
          return user?.id || this.getClientIp(req);
        },
      },
      {
        name: 'file-upload',
        ttl: 60000,
        limit: 10,
        keyGenerator: (req: Request) => {
          const user = (req as any).user;
          return user?.id || this.getClientIp(req);
        },
      },
      {
        name: 'default',
        ttl: 60000,
        limit: 600,
        keyGenerator: (req: Request) => this.getClientIp(req),
      },
    ];
  }
}