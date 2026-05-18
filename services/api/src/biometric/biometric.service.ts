import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private eventEmitter: EventEmitter2,
  ) {}

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

    return { ingested, duplicates, errors };
  }

  private async updateUUPBiometric(userId: string): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        AVG(sleep_hours) as avg_sleep,
        AVG(stress_index) as avg_stress,
        AVG(hrv) as avg_hrv
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${sevenDaysAgo}
    `;

    const { avg_sleep, avg_stress, avg_hrv } = stats[0] || {};

    await this.uupSync.sync({
      source: 'biometric',
      userId,
      data: {
        biometric: {
          avg_sleep_hours: avg_sleep || undefined,
          stress_index: avg_stress || undefined,
          hrv_baseline: avg_hrv || undefined,
          last_sync: new Date().toISOString(),
        },
      },
      actorId: 'system',
      actorRole: 'ADMIN',
    });
  }

  private async triggerDoterTransition(userId: string): Promise<void> {
    const uup = await this.uupSync.getUUP(userId);
    const { sleep_hours, stress_index } = uup.biometric || {};

    let newState = uup.gamification?.doter_state || 'NEUTRAL';

    if (sleep_hours !== undefined && sleep_hours < 6) {
      newState = 'SLUGGISH';
    } else if (stress_index !== undefined && stress_index > 0.7) {
      newState = 'SLUGGISH';
    } else if (sleep_hours !== undefined && sleep_hours >= 8 && (stress_index === undefined || stress_index < 0.3)) {
      newState = 'ENERGETIC';
    }

    if (newState !== uup.gamification?.doter_state) {
      await this.uupSync.sync({
        source: 'gamification',
        userId,
        data: { gamification: { doter_state: newState } },
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      this.eventEmitter.emit('doter:state:changed', { userId, newState });
    }
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