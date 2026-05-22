import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SafetyScoreInput {
  focusConsistency: number;
  routineCompletion: number;
  sleepRegularity: number;
  socialEngagement: number;
  biometricStability: number;
}

export interface SafetyScoreResult {
  score: number;
  breakdown: {
    focusConsistency: { value: number; weight: number; contribution: number };
    routineCompletion: { value: number; weight: number; contribution: number };
    sleepRegularity: { value: number; weight: number; contribution: number };
    socialEngagement: { value: number; weight: number; contribution: number };
    biometricStability: { value: number; weight: number; contribution: number };
  };
  trend: 'improving' | 'stable' | 'declining';
  lastCalculated: string;
}

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private eventEmitter: EventEmitter2,
  ) {}

  async calculateSafetyScore(userId: string): Promise<SafetyScoreResult> {
    const focusConsistency = await this.calculateFocusConsistency(userId);
    const routineCompletion = await this.calculateRoutineCompletion(userId);
    const sleepRegularity = await this.calculateSleepRegularity(userId);
    const socialEngagement = await this.calculateSocialEngagement(userId);
    const biometricStability = await this.calculateBiometricStability(userId);

    const raw = (
      focusConsistency * 0.30 +
      routineCompletion * 0.25 +
      sleepRegularity * 0.20 +
      socialEngagement * 0.15 +
      biometricStability * 0.10
    );

    const score = Math.round(Math.max(0, Math.min(100, raw)));

    const breakdown = {
      focusConsistency: { value: focusConsistency, weight: 30, contribution: focusConsistency * 0.30 },
      routineCompletion: { value: routineCompletion, weight: 25, contribution: routineCompletion * 0.25 },
      sleepRegularity: { value: sleepRegularity, weight: 20, contribution: sleepRegularity * 0.20 },
      socialEngagement: { value: socialEngagement, weight: 15, contribution: socialEngagement * 0.15 },
      biometricStability: { value: biometricStability, weight: 10, contribution: biometricStability * 0.10 },
    };

    const trend = await this.calculateTrend(userId, score);

    const result: SafetyScoreResult = {
      score,
      breakdown,
      trend,
      lastCalculated: new Date().toISOString(),
    };

    if (score < 40) {
      this.eventEmitter.emit('safety:alert', { userId, score, type: score < 25 ? 'critical' : 'warning' });
    }

    return result;
  }

  private async calculateFocusConsistency(userId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const heartbeats = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(focus_score) as avg_focus FROM agent_heartbeats
      WHERE user_id = ${userId} AND timestamp > ${sevenDaysAgo}
    `;

    return heartbeats[0]?.avg_focus || 0.5;
  }

  private async calculateRoutineCompletion(userId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COUNT(*) as total
      FROM planner_slots
      WHERE user_id = ${userId} AND week_start > ${sevenDaysAgo}
    `;

    const { completed, total } = result[0] || { completed: 0, total: 1 };
    return total > 0 ? completed / total : 0.5;
  }

  private async calculateSleepRegularity(userId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const bedtimes = await this.prisma.$queryRaw<any[]>`
      SELECT EXTRACT(HOUR FROM time) as hour
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${sevenDaysAgo} AND sleep_hours IS NOT NULL
      ORDER BY time
    `;

    if (bedtimes.length < 7) return 0.5;

    const hours = bedtimes.map(b => b.hour);
    const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
    const variance = hours.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / hours.length;
    const stddev = Math.sqrt(variance);

    return Math.max(0, 1 - (stddev / 3));
  }

  private async calculateSocialEngagement(userId: string): Promise<number> {
    const messagesResult = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM messages
      WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '7 days'
    `;

    const podResult = await this.prisma.$queryRaw<any[]>`
      SELECT SUM(duration_minutes) as minutes FROM pod_sessions
      WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '7 days'
    `;

    const messages = messagesResult[0]?.count || 0;
    const podMinutes = podResult[0]?.minutes || 0;

    const target = 50;
    return Math.min(1, (messages * 0.5 + podMinutes * 0.01) / target);
  }

  private async calculateBiometricStability(userId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(stress_index) as avg_stress, AVG(hrv) as avg_hrv
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${sevenDaysAgo}
    `;

    const avgStress = result[0]?.avg_stress || 0.5;
    const avgHrv = result[0]?.avg_hrv || 0.5;

    return 1 - avgStress;
  }

  private async calculateTrend(userId: string, currentScore: number): Promise<'improving' | 'stable' | 'declining'> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const history = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(score) as avg_score FROM safety_scores
      WHERE user_id = ${userId} AND created_at > ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 7
    `;

    if (history.length < 2) return 'stable';

    const recent = history.slice(0, Math.ceil(history.length / 2));
    const older = history.slice(Math.ceil(history.length / 2));

    const recentAvg = recent.reduce((a, b) => a + b.avg_score, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b.avg_score, 0) / older.length;

    const delta = recentAvg - olderAvg;
    if (delta > 5) return 'improving';
    if (delta < -5) return 'declining';
    return 'stable';
  }

  async getLatestSafetyScore(userId: string): Promise<SafetyScoreResult | null> {
    return this.calculateSafetyScore(userId);
  }

  async getSafetyScoreHistory(userId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.prisma.$queryRaw`
      SELECT score, created_at as date FROM safety_scores
      WHERE user_id = ${userId} AND created_at > ${startDate}
      ORDER BY created_at ASC
    `;
  }
}
