import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

export type DataSource = 'gamification' | 'academic' | 'biometric' | 'entrepreneurship' | 'social' | 'metadata';

interface CrossPillarTrigger {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

@Injectable()
export class UupSyncService {
  private readonly logger = new Logger(UupSyncService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async syncUUP(userId: string, source: DataSource, payload: Record<string, any>): Promise<void> {
    // 1. Load current user + UUP
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User not found: ${userId}`);

    const currentUUP = (user.uupData as Record<string, any>) || {};

    // 2. Deep merge pillar update
    const updatedUUP = {
      ...currentUUP,
      [source]: {
        ...(currentUUP[source] || {}),
        ...payload,
      },
    };

    // 3. Cross-Pillar Logic
    const triggers = await this.evaluateCrossPillarTriggers(userId, source, payload, updatedUUP);

    // 4. Persist UUP
    await this.prisma.user.update({
      where: { id: userId },
      data: { uupData: updatedUUP, updatedAt: new Date() },
    });

    // 5. Broadcast via Redis Pub/Sub
    await this.redis.publish(
      'uup_updates',
      JSON.stringify({ userId, source, updatedUUP, triggers, timestamp: new Date().toISOString() }),
    );

    // 6. Audit
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'UUP_SYNC',
        payload: { source, triggersCount: triggers.length },
      },
    });

    this.logger.log(`🔄 UUP synced for user ${userId} | source: ${source} | triggers: ${triggers.length}`);
  }

  private async evaluateCrossPillarTriggers(
    userId: string,
    source: DataSource,
    payload: Record<string, any>,
    uup: Record<string, any>,
  ): Promise<CrossPillarTrigger[]> {
    const triggers: CrossPillarTrigger[] = [];

    // ── Biometric Triggers ────────────────────────────────────────────────────
    if (source === 'biometric') {
      const sleep = payload.avg_sleep_hours ?? uup.biometric?.avg_sleep_hours ?? 8;

      if (sleep < 6) {
        // Apply SLUGGISH debuff to Doter
        await this.prisma.doterProfile.updateMany({
          where: { userId },
          data: { isSluggy: true },
        });
        // Notify parent
        await this.createNotification(userId, 'LOW_SLEEP_ALERT', {
          title: '😴 Low Sleep Alert',
          body: `Sleep recorded: ${sleep}h. Recommended minimum is 7h for optimal focus.`,
        });
        triggers.push({ type: 'DOTER_SLUGGISH', severity: 'high', message: `Sleep < 6h: Doter debuffed` });
      } else if (sleep >= 8) {
        // Remove sluggish, apply energetic buff
        await this.prisma.doterProfile.updateMany({
          where: { userId },
          data: { isSluggy: false, isEnergetic: true },
        });
        triggers.push({ type: 'DOTER_ENERGETIC', severity: 'low', message: `Great sleep! Doter buffed` });
      }

      const focus = payload.focus_score ?? 0;
      if (focus < 40) {
        await this.createNotification(userId, 'LOW_FOCUS_ALERT', {
          title: '🧠 Focus Drop Detected',
          body: 'Your focus score is low. How about a 5-minute mindfulness break?',
        });
        triggers.push({ type: 'MINDFULNESS_SUGGESTION', severity: 'medium', message: `Focus < 40` });
      }

      const stress = payload.stress_level ?? 0;
      if (stress > 0.7) {
        await this.createNotification(userId, 'HIGH_STRESS_ALERT', {
          title: '⚡ Stress Spike Detected',
          body: 'High stress detected. Consider taking a short break or trying a breathing exercise.',
        });
        triggers.push({ type: 'STRESS_ALERT', severity: 'high', message: `Stress level ${stress}` });
      }
    }

    // ── Academic Triggers ─────────────────────────────────────────────────────
    if (source === 'academic') {
      const skillGaps = payload.skill_gaps || {};
      const criticalGaps = Object.entries(skillGaps).filter(([_, v]) => (v as number) < 0.2);

      if (criticalGaps.length > 0) {
        await this.createNotification(userId, 'SKILL_GAP_ALERT', {
          title: '📚 Critical Skill Gaps Found',
          body: `${criticalGaps.length} subject(s) need attention: ${criticalGaps.map(([k]) => k).join(', ')}`,
        });
        triggers.push({
          type: 'CRITICAL_SKILL_GAPS',
          severity: 'high',
          message: `${criticalGaps.length} critical gaps detected`,
        });
      }
    }

    // ── Gamification Triggers ─────────────────────────────────────────────────
    if (source === 'gamification') {
      const xp = payload.xp ?? uup.gamification?.xp ?? 0;
      const level = Math.floor(xp / 1000) + 1;
      if (level > (uup.gamification?.level ?? 1)) {
        await this.createNotification(userId, 'LEVEL_UP', {
          title: '🎉 Level Up!',
          body: `You reached Level ${level}! Your Doter is evolving!`,
        });
        triggers.push({ type: 'LEVEL_UP', severity: 'low', message: `New level: ${level}` });
      }
    }

    // ── Entrepreneurship Triggers ─────────────────────────────────────────────
    if (source === 'entrepreneurship') {
      const revenue = payload.total_revenue_usd ?? uup.entrepreneurship?.total_revenue_usd ?? 0;
      if (revenue > 500 && (uup.entrepreneurship?.total_revenue_usd ?? 0) <= 500) {
        await this.createNotification(userId, 'VENTURE_MILESTONE', {
          title: '💰 Major Venture Milestone!',
          body: `Congratulations! Your total revenue has exceeded $500. A special Doter accessory has been unlocked!`,
        });
        triggers.push({ type: 'REVENUE_MILESTONE', severity: 'low', message: `Revenue > $500` });
      }
    }

    // ── Social Triggers ───────────────────────────────────────────────────────
    if (source === 'social') {
      const safetyScore = payload.safety_score ?? 100;
      if (safetyScore < 70) {
        await this.createNotification(userId, 'SAFETY_ALERT', {
          title: '🛡️ Safety Alert',
          body: `A drop in social safety score has been detected. We recommend reviewing recent interactions.`,
        });
        triggers.push({ type: 'SAFETY_RISK', severity: 'critical', message: `Safety score < 70` });
      }
    }

    return triggers;
  }

  private async createNotification(
    userId: string,
    type: string,
    data: { title: string; body: string },
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: data.title,
        body: data.body,
        data: {},
      },
    });
  }

  async getUUP(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.uupData;
  }
}
