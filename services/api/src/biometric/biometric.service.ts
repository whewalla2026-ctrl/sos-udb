import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
import { FeatureFlagService } from '../feature-flags/feature-flag.service';

export interface BiometricEntry {
  time: Date;
  userId: string;
  hrv?: number;
  sleepHours?: number;
  stressIndex?: number;
  restingHr?: number;
  steps?: number;
  source: 'healthkit' | 'googlefit' | 'manual';
}

@Injectable()
export class BiometricService implements OnModuleInit {
  private readonly logger = new Logger(BiometricService.name);
  private streakFreezeEnabled = false;

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private eventEmitter: EventEmitter2,
    private redis: RedisService,
    private featureFlags: FeatureFlagService,
  ) {}

  async onModuleInit() {
    this.streakFreezeEnabled = await this.featureFlags.isEnabled('streak-freeze-auto');
    
    this.eventEmitter.on('udb:uup_updated', async (data: { userId: string; source: string }) => {
      if (data.source === 'biometric' && this.streakFreezeEnabled) {
        await this.checkStreakFreezeConditions(data.userId);
      }
    });
  }

  async syncEntries(userId: string, entries: BiometricEntry[]): Promise<{ ingested: number; duplicates: number; errors: string[] }> {
    let ingested = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        await this.prisma.$executeRaw`
          INSERT INTO biometric_logs (time, user_id, hrv, sleep_hours, stress_index, resting_hr, steps, source, created_at)
          VALUES (${entry.time}, ${entry.userId}, ${entry.hrv || null}, ${entry.sleepHours || null}, ${entry.stressIndex || null}, ${entry.restingHr || null}, ${entry.steps || null}, ${entry.source}, NOW())
          ON CONFLICT (time, user_id) DO NOTHING
        `;
        ingested++;
      } catch (error) {
        if (error.message.includes('duplicate')) {
          duplicates++;
        } else {
          errors.push(error.message);
        }
      }
    }

    await this.updateUUPBiometric(userId);
    await this.triggerDoterTransition(userId);

    if (this.streakFreezeEnabled) {
      await this.checkStreakFreezeConditions(userId);
    }

    return { ingested, duplicates, errors };
  }

  private async updateUUPBiometric(userId: string): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        AVG(sleep_hours) as avg_sleep,
        AVG(stress_index) as avg_stress,
        AVG(hrv) as avg_hrv,
        AVG(resting_hr) as avg_resting_hr
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${sevenDaysAgo}
    `;

    const { avg_sleep, avg_stress, avg_hrv, avg_resting_hr } = stats[0] || {};

    await this.uupSync.sync({
      source: 'biometric',
      userId,
      data: {
        biometric: {
          chronotype: 'neutral',
          avg_sleep_hours: avg_sleep || undefined,
          stress_index: avg_stress || undefined,
          hrv_baseline: avg_hrv || undefined,
          last_sync: new Date().toISOString(),
        },
      } as any,
      actorId: 'system',
      actorRole: 'ADMIN',
    });
  }

  private async triggerDoterTransition(userId: string): Promise<void> {
    const uup: any = await this.uupSync.getUUP(userId);
    const biometric: any = uup.biometric || {};
    const sleepHours = biometric.avg_sleep_hours;
    const stressIndex = biometric.stress_index;
    const gamification: any = uup.gamification || {};

    let newState = gamification.doter_state || 'NEUTRAL';

    if (sleepHours !== undefined && sleepHours < 6) {
      newState = 'SLUGGISH';
    } else if (stressIndex !== undefined && stressIndex > 0.7) {
      newState = 'SLUGGISH';
    } else if (sleepHours !== undefined && sleepHours >= 8 && (stressIndex === undefined || stressIndex < 0.3)) {
      newState = 'ENERGETIC';
    }

    if (newState !== gamification.doter_state) {
      await this.uupSync.sync({
        source: 'gamification',
        userId,
        data: { gamification: { doter_state: newState } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      this.eventEmitter.emit('doter:state:changed', { userId, newState });
    }
  }

  private async checkStreakFreezeConditions(userId: string): Promise<void> {
    const redisKey = `streak_freeze_auto:${userId}`;
    const existing = await this.redis.get(redisKey);
    if (existing) {
      this.logger.log(`Streak freeze already granted for ${userId} in last 30 days`);
      return;
    }

    const conditions = await this.evaluateStreakFreezeConditions(userId);
    
    if (conditions.allMet) {
      await this.grantStreakFreeze(userId);
    }
  }

  private async evaluateStreakFreezeConditions(userId: string): Promise<{
    allMet: boolean;
    hrvDrop: boolean;
    lowSleep: boolean;
    elevatedHr: boolean;
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const baseline = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(hrv) as hrv, AVG(resting_hr) as resting_hr
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${fourteenDaysAgo} AND time <= ${sevenDaysAgo}
    `;

    const recent = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(hrv) as hrv, AVG(resting_hr) as resting_hr,
        COUNT(*) FILTER (WHERE sleep_hours < 5) as low_sleep_days
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${sevenDaysAgo}
    `;

    const baselineHrv = baseline[0]?.hrv;
    const baselineRestingHr = baseline[0]?.resting_hr;
    const recentHrv = recent[0]?.hrv;
    const recentRestingHr = recent[0]?.resting_hr;
    const lowSleepDays = parseInt(recent[0]?.low_sleep_days || '0');

    const hrvDrop = baselineHrv && recentHrv 
      ? (baselineHrv - recentHrv) / baselineHrv > 0.2 
      : false;
    
    const lowSleep = lowSleepDays >= 2;
    
    const elevatedHr = baselineRestingHr && recentRestingHr
      ? (recentRestingHr - baselineRestingHr) / baselineRestingHr > 0.15
      : false;

    return {
      allMet: hrvDrop && lowSleep && elevatedHr,
      hrvDrop,
      lowSleep,
      elevatedHr,
    };
  }

  private async grantStreakFreeze(userId: string): Promise<void> {
    const redisKey = `streak_freeze_auto:${userId}`;
    await this.redis.setex(redisKey, 30 * 24 * 60 * 60, '1');

    await this.prisma.pointsLedger.create({
      data: {
        userId,
        transactionType: 'EARN',
        amount: 1,
        balanceAfter: 0,
        source: 'STREAK_REWARD',
        description: 'STREAK_FREEZE_AUTO_GRANT',
        metadata: { grantedAt: new Date().toISOString() },
        status: 'SETTLED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'STREAK_FREEZE_AUTO_GRANT',
        payload: JSON.stringify({
          grantedAt: new Date().toISOString(),
          reason: 'Biometric conditions met (BR-06)',
        }),
      },
    });

    const uup: any = await this.uupSync.getUUP(userId);
    if (uup.gamification?.doter_state !== 'RESTING') {
      await this.uupSync.sync({
        source: 'gamification',
        userId,
        data: { gamification: { doter_state: 'RESTING' } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      });
    }

    this.eventEmitter.emit('notification:create', {
      userId,
      type: 'STREAK_FREEZE',
      title: 'Streak Protected!',
      message: 'Your streak has been automatically protected due to your recent rest patterns. Take care of yourself!',
    });

    this.logger.log(`Streak freeze auto-granted for user ${userId}`);
  }

  async calculateChronotype(userId: string): Promise<string> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const data = await this.prisma.$queryRaw<any[]>`
      SELECT 
        EXTRACT(HOUR FROM time) as hour,
        AVG(hrv) as hrv
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${fourteenDaysAgo} AND hrv IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM time)
      ORDER BY hour
    `;

    if (data.length < 7) return 'neutral';

    const morningHrv = data.filter(d => d.hour >= 6 && d.hour <= 11).reduce((a, b) => a + b.hrv, 0) / 5;
    const afternoonHrv = data.filter(d => d.hour >= 12 && d.hour <= 17).reduce((a, b) => a + b.hrv, 0) / 6;
    const eveningHrv = data.filter(d => d.hour >= 18 && d.hour <= 22).reduce((a, b) => a + b.hrv, 0) / 5;

    const peakHrv = Math.max(morningHrv, afternoonHrv, eveningHrv);

    if (peakHrv === morningHrv) return 'morning_logic';
    if (peakHrv === afternoonHrv) return 'afternoon_creative';
    if (peakHrv === eveningHrv) return 'evening_social';
    return 'neutral';
  }

  async getDailySummary(userId: string, date: Date): Promise<any> {
    return this.prisma.$queryRaw`
      SELECT 
        AVG(sleep_hours) as avg_sleep,
        AVG(stress_index) as avg_stress,
        SUM(steps) as total_steps
      FROM biometric_logs
      WHERE user_id = ${userId} AND DATE(time) = DATE(${date})
    `;
  }
}
