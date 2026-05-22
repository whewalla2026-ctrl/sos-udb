import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { UserRole } from '../shared/user-role';
import { MetricsService } from '../shared/metrics.controller';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private metrics: MetricsService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (admin.apps.length) return;

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const gacPath = this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    // Try GOOGLE_APPLICATION_CREDENTIALS file first
    if (gacPath && fs.existsSync(gacPath)) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.logger.log(`Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS: ${gacPath}`);
        return;
      } catch (e) {
        this.logger.warn(`GOOGLE_APPLICATION_CREDENTIALS file found but failed: ${e}`);
      }
    }

    if (!projectId || !privateKey || !clientEmail) {
      if (isProd) {
        this.logger.error(
          'FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL must be set in production. ' +
          'Alternatively, set GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON file.',
        );
      } else {
        this.logger.warn('Firebase Admin not initialized (credentials missing) — auth methods will be unavailable');
      }
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
      this.logger.log('Firebase Admin initialized via env vars');
    } catch (e) {
      if (isProd) {
        this.logger.error(`Firebase Admin failed to initialize: ${e}`);
      } else {
        this.logger.warn('Firebase Admin not initialized (invalid credentials) — auth methods will be unavailable');
      }
    }
  }

  async verifyFirebaseToken(idToken: string) {
    if (!admin.apps.length) {
      this.metrics.authFailures.inc({ reason: 'firebase_not_configured' });
      throw new UnauthorizedException('Firebase not configured');
    }
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return decoded;
    } catch (error) {
      this.metrics.authFailures.inc({ reason: 'invalid_firebase_token' });
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  async loginWithFirebase(idToken: string) {
    const decoded = await this.verifyFirebaseToken(idToken);

    const role: UserRole = (decoded.role as UserRole) || UserRole.CHILD;

    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email || '',
          displayName: decoded.name || '',
          avatarUrl: decoded.picture || '',
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

      if (role === UserRole.CHILD) {
        await this.prisma.doterProfile.create({
          data: { userId: user.id },
        });
        this.logger.log(`Doter created for new child user: ${user.id}`);
      }

      this.metrics.signupsTotal.inc({ role });
      this.logger.log(`New user registered: ${user.email} (${role})`);
    }

    const jti = crypto.randomUUID();
    const payload = { sub: user.id, email: user.email, role: user.role, jti };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        payload: { provider: 'firebase', role, jti },
      },
    });

    return { accessToken, refreshToken, user };
  }

  async refreshAccessToken(refreshToken: string) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.redis.get(`refresh:${hashedToken}`);
    if (!stored) {
      this.metrics.authFailures.inc({ reason: 'invalid_refresh_token' });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { userId } = JSON.parse(stored);

    await this.redis.del(`refresh:${hashedToken}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      this.metrics.authFailures.inc({ reason: 'user_deactivated' });
      throw new UnauthorizedException('User not found or deactivated');
    }

    const jti = crypto.randomUUID();
    const payload = { sub: user.id, email: user.email, role: user.role, jti };
    const newAccessToken = this.jwt.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
  }

  async logout(accessToken: string, refreshToken: string) {
    try {
      const decoded = this.jwt.verify(accessToken) as any;
      if (decoded?.jti) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(`blacklist:${decoded.jti}`, 'true', 'EX', ttl);
        }
      }
    } catch {
      this.logger.warn('Logout with invalid access token');
    }

    if (refreshToken) {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.redis.del(`refresh:${hashedToken}`);
    }

    this.logger.log('User logged out');
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${jti}`);
    return result === 'true';
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.redis.set(
      `refresh:${hashedToken}`,
      JSON.stringify({ userId }),
      'EX',
      7 * 24 * 60 * 60,
    );

    return refreshToken;
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findOrCreateFromAuth0(payload: any): Promise<any> {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }

  async validateCredentials(email: string, password: string): Promise<any> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
