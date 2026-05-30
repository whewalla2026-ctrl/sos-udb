import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  familyId?: string;
  age?: number;
  jti: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  familyId?: string;
}

@Injectable()
export class JwtTokenService {
  private readonly REFRESH_TTL = 24 * 60 * 60;

  constructor(
    private jwtService: NestJwtService,
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  generateAccessToken(user: { id: string; email: string; role: string; familyId?: string; age?: number }): string {
    const jti = crypto.randomUUID();
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
      age: user.age,
      jti,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      expiresIn: '2h',
      algorithm: 'HS256',
    });
  }

  async generateRefreshToken(user: { id: string; familyId?: string }): Promise<string> {
    const jti = crypto.randomUUID();
    const payload: RefreshTokenPayload = {
      sub: user.id,
      jti,
      type: 'refresh',
      familyId: user.familyId,
    };

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '24h',
      algorithm: 'HS256',
    });

    await this.redis.setex(
      `jwt:refresh:${jti}`,
      this.REFRESH_TTL,
      JSON.stringify({ userId: user.id, familyId: user.familyId }),
    );

    return refreshToken;
  }

  async rotateRefreshToken(refreshToken: string, user: { id: string; email: string; role: string; familyId?: string; age?: number }): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
      algorithms: ['HS256'],
    });

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const raw = await this.redis.get(`jwt:refresh:${decoded.jti}`);
    if (!raw) {
      throw new UnauthorizedException('Token not recognized');
    }
    const stored = JSON.parse(raw);
    if (stored.userId !== user.id) {
      throw new UnauthorizedException('Token not recognized');
    }

    await this.redis.del(`jwt:refresh:${decoded.jti}`);

    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: await this.generateRefreshToken({ id: user.id, familyId: user.familyId }),
    };
  }

  async revokeRefreshToken(jti: string): Promise<void> {
    await this.redis.del(`jwt:refresh:${jti}`);
  }

  async isRefreshTokenValid(jti: string): Promise<boolean> {
    const raw = await this.redis.get(`jwt:refresh:${jti}`);
    return raw !== null;
  }

  getAccessTokenExpiry(): Date {
    return new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
