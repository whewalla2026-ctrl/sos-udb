import { Controller, Post, Get, Body, Req, Res, HttpCode, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../shared/user-role';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private metrics: MetricsService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(
    @Body() body: { email: string; password: string; displayName: string; role?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password, displayName, role: bodyRole = 'CHILD' } = body;
    if (!email || !password || password.length < 8) {
      return { error: 'Invalid email or password (min 8 chars)' };
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: 'Email already exists' };
    }

    const role = bodyRole === 'PARENT' ? UserRole.PARENT : bodyRole === 'ADMIN' ? UserRole.ADMIN : UserRole.CHILD;

    const user = await this.prisma.user.create({
      data: {
        email,
        firebaseUid: `email:${email}`,
        displayName,
        role,
        uupData: {
          gamification: { level: 1, xp: 0, coin_balance: 0, doter_state: 'EGG', streak: 0 },
          academic: { math_rit: 0, reading_rit: 0, lms_sync_status: 'pending', skill_gaps: {} },
          biometric: { avg_sleep_hours: 0, stress_index: 0, focus_score: 0, last_sync: null },
          entrepreneurship: { active_projects: [], total_revenue_usd: 0, wallet_balance: 0 },
          metadata: { blockchain_wallet: null, coppa_consent: false },
        },
        accessibilitySettings: {
          dyslexiaMode: false,
          highContrast: false,
          tts: false,
          fontSize: 'medium',
        },
      },
    });

    // Store password hash in Redis
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    await this.redis.set(`cred:${user.id}`, passwordHash, 'EX', 365 * 24 * 60 * 60);

    if (role === UserRole.CHILD) {
      await this.prisma.doterProfile.create({ data: { userId: user.id } });
    }

    const jti = crypto.randomUUID();
    const payload = { sub: user.id, email: user.email, role: user.role, jti };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.authService['generateRefreshToken'](user.id);

    this.metrics.signupsTotal.inc({ role });
    setAuthCookies(res, accessToken, refreshToken);

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = body;
    if (!email || !password) {
      return { error: 'Email and password required' };
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: 'Invalid credentials' };
    }

    // Check password hash in Redis
    const storedHash = await this.redis.get(`cred:${user.id}`);
    if (!storedHash) {
      return { error: 'No credentials stored. Register via this service first.' };
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (storedHash !== passwordHash) {
      return { error: 'Invalid credentials' };
    }

    const jti = crypto.randomUUID();
    const payload = { sub: user.id, email: user.email, role: user.role, jti };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.authService['generateRefreshToken'](user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!rt) {
      return { error: 'No refresh token' };
    }

    try {
      const result = await this.authService.refreshAccessToken(rt);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return {
        userId: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
      };
    } catch {
      clearAuthCookies(res);
      return { error: 'Invalid or expired refresh token' };
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const at = req.cookies?.[ACCESS_TOKEN_COOKIE];
    const rt = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (at || rt) {
      await this.authService.logout(at || '', rt || '');
    }
    clearAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const at = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!at) {
      return { error: 'No session' };
    }
    try {
      const decoded = this.jwt.verify(at) as any;
      if (decoded?.jti) {
        const blacklisted = await this.authService.isTokenBlacklisted(decoded.jti);
        if (blacklisted) {
          return { error: 'Session revoked' };
        }
      }
      const user = await this.authService.validateUser(decoded.sub);
      if (!user) {
        return { error: 'User not found' };
      }
      return {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      };
    } catch {
      return { error: 'Invalid or expired token' };
    }
  }
}
