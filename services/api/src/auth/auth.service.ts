import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { UserRole } from '../shared/user-role';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    // Initialize Firebase Admin (graceful if credentials not configured)
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.get('FIREBASE_PROJECT_ID'),
            privateKey: config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
            clientEmail: config.get('FIREBASE_CLIENT_EMAIL'),
          }),
        });
      } catch (e) {
        this.logger.warn('Firebase Admin not initialized (credentials missing) — auth methods will be unavailable');
      }
    }
  }

  async verifyFirebaseToken(idToken: string) {
    if (!admin.apps.length) {
      throw new UnauthorizedException('Firebase not configured');
    }
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  async loginWithFirebase(idToken: string, role: UserRole = UserRole.PARENT) {
    const decoded = await this.verifyFirebaseToken(idToken);

    // Upsert user
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

      // Create Doter for child accounts
      if (role === UserRole.CHILD) {
        await this.prisma.doterProfile.create({
          data: { userId: user.id },
        });
        this.logger.log(`🥚 Doter created for new child user: ${user.id}`);
      }

      this.logger.log(`✨ New user registered: ${user.email} (${role})`);
    }

    // Mint JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload);

    // Audit
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        payload: { provider: 'firebase', role },
      },
    });

    return { accessToken, user };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
