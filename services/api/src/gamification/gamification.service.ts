import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type DoterState = 'ENERGETIC' | 'NEUTRAL' | 'SLUGGISH' | 'EVOLVING' | 'RESTING';

export interface DoterTransition {
  from: DoterState;
  to: DoterState;
  trigger: string;
  timestamp: Date;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'QUEST_REWARD' | 'SPENT' | 'PURCHASED_FREEZE' | 'ESCROW_HOLD' | 'ESCROW_RELEASE' | 'ESCROW_REFUND' | 'ADMIN_ADJUSTMENT';
  status: 'COMPLETED' | 'PENDING' | 'REVERSED';
  reference?: string;
  hash: string;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private eventEmitter: EventEmitter2,
  ) {}

  async processBiometricUpdate(userId: string, biometricData: {
    sleepHours?: number;
    stressIndex?: number;
    hrv?: number;
  }): Promise<DoterState> {
    const uup = await this.uupSync.getUUP(userId);
    let newState = uup.gamification.doter_state;

    if (biometricData.sleepHours !== undefined) {
      uup.biometric.avg_sleep_hours = biometricData.sleepHours;
    }
    if (biometricData.stressIndex !== undefined) {
      uup.biometric.stress_index = biometricData.stressIndex;
    }
    if (biometricData.hrv !== undefined) {
      uup.biometric.hrv_baseline = biometricData.hrv;
    }

    newState = this.calculateDoterState(uup);

    const previousState = uup.gamification.doter_state;

    if (newState !== previousState) {
      await this.uupSync.sync({
        source: 'gamification',
        userId,
        data: { gamification: { doter_state: newState } as any },
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      this.eventEmitter.emit('doter:state:changed', {
        userId,
        previousState,
        newState,
        timestamp: new Date(),
      });

      if (newState === 'EVOLVING') {
        this.eventEmitter.emit('doter:evolve', { userId });
      }
      if (newState === 'SLUGGISH') {
        this.eventEmitter.emit('doter:sluggish', { userId });
      }
    }

    return newState;
  }

  private calculateDoterState(uup: any): DoterState {
    const sleep = uup.biometric?.avg_sleep_hours;
    const stress = uup.biometric?.stress_index;
    const streak = uup.gamification?.active_streaks;

    if (uup.gamification?.doter_state === 'RESTING') {
      return 'RESTING';
    }

    if (sleep !== undefined && sleep < 6) {
      return 'SLUGGISH';
    }
    if (stress !== undefined && stress > 0.7) {
      return 'SLUGGISH';
    }

    if (sleep !== undefined && sleep >= 8 && (stress === undefined || stress < 0.3) && streak > 0) {
      return 'ENERGETIC';
    }

    return 'NEUTRAL';
  }

  async awardPoints(userId: string, amount: number, type: string, reference?: string): Promise<PointsTransaction> {
    const hash = await this.generateTransactionHash(userId, amount, type, reference);

    const existing = await this.prisma.$queryRaw<PointsTransaction[]>`
      SELECT * FROM transactions WHERE hash = ${hash} LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0];
    }

    await this.prisma.$executeRaw`
      INSERT INTO transactions (id, user_id, amount, type, status, hash, reference, created_at)
      VALUES (
        gen_random_uuid(),
        ${userId},
        ${amount},
        ${type},
        'COMPLETED',
        ${hash},
        ${reference || null},
        NOW()
      )
    `;

    const uup = await this.uupSync.getUUP(userId);
    await this.uupSync.sync({
      source: 'gamification',
      userId,
      data: {
        gamification: {
          coin_balance: (uup.gamification?.coin_balance || 0) + amount,
          xp: (uup.gamification?.xp || 0) + amount,
        } as any,
      },
      actorId: 'system',
      actorRole: 'ADMIN',
    });

    return {
      id: crypto.randomUUID(),
      userId,
      amount,
      type: type as any,
      status: 'COMPLETED',
      reference,
      hash,
    };
  }

  async spendPoints(userId: string, amount: number, type: string, reference?: string): Promise<PointsTransaction> {
    const uup = await this.uupSync.getUUP(userId);
    const balance = uup.gamification?.coin_balance || 0;

    if (balance < amount) {
      throw new Error('Insufficient points');
    }

    return this.awardPoints(userId, -amount, type, reference);
  }

  private async generateTransactionHash(userId: string, amount: number, type: string, reference?: string): Promise<string> {
    const payload = `${userId}:${amount}:${type}:${reference || ''}:${Date.now()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async activateStreakFreeze(userId: string, reason: 'manual' | 'auto'): Promise<boolean> {
    const uup = await this.uupSync.getUUP(userId);

    if (reason === 'auto') {
      const lastAuto = uup.gamification?.last_streak_freeze_auto;
      if (lastAuto) {
        const daysSinceAuto = (Date.now() - new Date(lastAuto).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAuto < 30) {
          return false;
        }
      }

      await this.uupSync.sync({
        source: 'gamification',
        userId,
        data: {
          gamification: {
            doter_state: 'RESTING',
            streak_freeze_available: (uup.gamification?.streak_freeze_available || 0),
            last_streak_freeze_auto: new Date().toISOString(),
          } as any,
        },
        actorId: 'system',
        actorRole: 'ADMIN',
      });
    } else {
      if ((uup.gamification?.streak_freeze_available || 0) <= 0) {
        return false;
      }

      await this.uupSync.sync({
        source: 'gamification',
        userId,
        data: {
          gamification: {
            doter_state: 'RESTING',
            streak_freeze_available: (uup.gamification?.streak_freeze_available || 1) - 1,
          } as any,
        },
        actorId: userId,
        actorRole: 'CHILD',
      });
    }

    return true;
  }

  async deactivateStreakFreeze(userId: string): Promise<void> {
    const uup = await this.uupSync.getUUP(userId);
    const previousState = uup.gamification?.doter_state === 'RESTING' ? 'NEUTRAL' : uup.gamification?.doter_state;

    await this.uupSync.sync({
      source: 'gamification',
      userId,
      data: { gamification: { doter_state: previousState || 'NEUTRAL' } as any },
      actorId: 'system',
      actorRole: 'ADMIN',
    });
  }

  async getPointsLedger(userId: string, limit = 50, offset = 0): Promise<PointsTransaction[]> {
    return this.prisma.$queryRaw`
      SELECT id, user_id as "userId", amount, type, status, hash, reference
      FROM transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async getPointsBalance(userId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ balance: number }]>`
      SELECT COALESCE(SUM(amount), 0) as balance
      FROM transactions
      WHERE user_id = ${userId} AND status = 'COMPLETED'
    `;
    return result[0]?.balance || 0;
  }
}

import * as crypto from 'crypto';
