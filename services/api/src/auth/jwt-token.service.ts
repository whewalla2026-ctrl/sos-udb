import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
  private readonly refreshTokens = new Map<string, { userId: string; expiresAt: number; familyId?: string }>();

  constructor(
    private jwtService: NestJwtService,
    private configService: ConfigService,
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

  generateRefreshToken(user: { id: string; familyId?: string }): string {
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

    this.refreshTokens.set(jti, {
      userId: user.id,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      familyId: user.familyId,
    });

    return refreshToken;
  }

  async rotateRefreshToken(refreshToken: string, user: { id: string; email: string; role: string; familyId?: string; age?: number }): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
      algorithms: ['HS256'],
    });

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const stored = this.refreshTokens.get(decoded.jti);
    if (!stored || stored.userId !== user.id) {
      throw new UnauthorizedException('Token not recognized');
    }

    if (Date.now() > stored.expiresAt) {
      this.refreshTokens.delete(decoded.jti);
      throw new UnauthorizedException('Refresh token expired');
    }

    this.refreshTokens.delete(decoded.jti);

    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken({ id: user.id, familyId: user.familyId }),
    };
  }

  revokeRefreshToken(jti: string): void {
    this.refreshTokens.delete(jti);
  }

  isRefreshTokenValid(jti: string): boolean {
    const stored = this.refreshTokens.get(jti);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      this.refreshTokens.delete(jti);
      return false;
    }
    return true;
  }

  getAccessTokenExpiry(): Date {
    return new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
