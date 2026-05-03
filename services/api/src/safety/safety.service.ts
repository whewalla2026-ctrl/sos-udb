import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  // Negative content patterns (simplified — real impl uses AI sentiment)
  private readonly DANGER_PATTERNS = ['meet in person', 'keep this secret', 'don\'t tell your parents', 'send me photos', 'hurt yourself'];
  private readonly BULLYING_PATTERNS = ['you\'re ugly', 'nobody likes you', 'kill yourself', 'loser'];

  constructor(private prisma: PrismaService) {}

  async analyzeMessage(content: string): Promise<{ isSafe: boolean; safetyScore: number; flags: string[] }> {
    const lower = content.toLowerCase();
    const flags: string[] = [];

    for (const p of this.DANGER_PATTERNS) {
      if (lower.includes(p)) flags.push('GROOMING_RISK');
    }
    for (const p of this.BULLYING_PATTERNS) {
      if (lower.includes(p)) flags.push('BULLYING_RISK');
    }

    const safetyScore = Math.max(0, 100 - flags.length * 30);
    return { isSafe: flags.length === 0, safetyScore, flags };
  }

  async recordSafetyScore(userId: string, score: number, alerts: string[]) {
    const safetyRecord = await this.prisma.safetyScore.create({
      data: { userId, score, alerts },
    });

    if (score < 70) {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'SAFETY_ALERT',
          title: '⚠️ Safety Alert',
          body: `Safety score dropped to ${score}/100. Please review activity.`,
          data: { alerts, score },
        },
      });
      this.logger.warn(`🚨 Safety score below 70 for user ${userId}: ${score}`);
    }

    return safetyRecord;
  }

  async getLatestSafetyScore(userId: string) {
    return this.prisma.safetyScore.findFirst({ where: { userId }, orderBy: { recordedAt: 'desc' } });
  }
}
