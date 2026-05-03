import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UupSyncService } from '../uup-sync/uup-sync.service';

@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UupSyncService,
  ) {}

  async logBiometric(userId: string, data: {
    sleepHours?: number;
    hrv?: number;
    stressLevel?: number;
    focusScore?: number;
    heartRate?: number;
    steps?: number;
    source: string;
  }) {
    const log = await this.prisma.biometricLog.create({
      data: {
        userId,
        sleepHours: data.sleepHours,
        hrv: data.hrv,
        stressLevel: data.stressLevel,
        focusScore: data.focusScore,
        heartRate: data.heartRate,
        steps: data.steps,
        source: data.source as any,
      },
    });

    // Calculate rolling 7-day averages
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = await this.prisma.biometricLog.findMany({
      where: { userId, loggedAt: { gte: sevenDaysAgo } },
    });

    const avg = (field: keyof typeof log) => {
      const vals = recentLogs.map(l => l[field]).filter(v => v !== null) as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    // Sync UUP biometric pillar
    await this.uupSync.syncUUP(userId, 'biometric', {
      avg_sleep_hours: parseFloat(avg('sleepHours').toFixed(1)),
      stress_index: parseFloat(avg('stressLevel').toFixed(2)),
      focus_score: parseFloat(avg('focusScore').toFixed(0)),
      hrv: parseFloat(avg('hrv').toFixed(1)),
      last_sync: new Date().toISOString(),
    });

    this.logger.log(`💓 Biometric logged for user ${userId}`);
    return log;
  }

  async getBiometricHistory(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.biometricLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
    });
  }

  // Cognitive Chronotype: identify peak focus windows
  async analyzeFocusPeak(userId: string): Promise<{ peakHour: number; reasoning: string }> {
    const logs = await this.getBiometricHistory(userId, 14);
    const hourlyFocus: Record<number, number[]> = {};

    logs.forEach(log => {
      if (log.focusScore !== null) {
        const hour = log.loggedAt.getHours();
        if (!hourlyFocus[hour]) hourlyFocus[hour] = [];
        hourlyFocus[hour].push(log.focusScore);
      }
    });

    let peakHour = 10; // default morning
    let peakScore = 0;
    Object.entries(hourlyFocus).forEach(([hour, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > peakScore) {
        peakScore = avg;
        peakHour = parseInt(hour);
      }
    });

    return {
      peakHour,
      reasoning: `Based on 14 days of biometric data, your brain is most focused at ${peakHour}:00 (average score: ${peakScore.toFixed(0)}/100).`,
    };
  }
}
