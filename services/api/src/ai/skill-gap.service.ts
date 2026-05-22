import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SkillGap {
  domain: string;
  status: 'active' | 'declining' | 'none';
  lastActivity: Date | null;
  suggestion?: string;
}

@Injectable()
export class SkillGapService {
  private readonly logger = new Logger(SkillGapService.name);
  private readonly skillDomains = ['academic', 'physical', 'social', 'creative', 'entrepreneurial'];

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async analyzeSkillGaps(userId: string): Promise<SkillGap[]> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    const gaps: SkillGap[] = [];

    for (const domain of this.skillDomains) {
      const recentActivities = await this.countDomainActivities(userId, domain, fourteenDaysAgo);
      const olderActivities = await this.countDomainActivities(userId, domain, twentyEightDaysAgo);

      let status: 'active' | 'declining' | 'none' = 'none';
      let lastActivity: Date | null = null;

      if (recentActivities > 0) {
        status = 'active';
        const lastActivityResult = await this.getLastActivityDate(userId, domain);
        lastActivity = lastActivityResult;
      } else if (olderActivities > 0) {
        status = 'declining';
      }

      gaps.push({ domain, status, lastActivity });
    }

    return gaps;
  }

  private async countDomainActivities(userId: string, domain: string, since: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM activities
      WHERE user_id = ${userId} AND domain = ${domain} AND created_at > ${since}
    `;
    return result[0]?.count || 0;
  }

  private async getLastActivityDate(userId: string, domain: string): Promise<Date | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT MAX(created_at) as last_activity FROM activities
      WHERE user_id = ${userId} AND domain = ${domain}
    `;
    return result[0]?.last_activity || null;
  }

  async runDailyAnalysis(): Promise<void> {
    const parents = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT family_id FROM users WHERE role = 'PARENT'
    `;

    for (const parent of parents) {
      const children = await this.prisma.$queryRaw<any[]>`
        SELECT id, age FROM users WHERE family_id = ${parent.family_id} AND role = 'CHILD'
      `;

      for (const child of children) {
        const gaps = await this.analyzeSkillGaps(child.id);
        const criticalGaps = gaps.filter(g => g.status === 'none' || g.status === 'declining');

        if (criticalGaps.length > 0) {
          const today = new Date();
          const interventionKey = `ai_intervention:${child.id}:${today.toISOString().split('T')[0]}`;
          
          const recentCount = 0;

          if (recentCount < 3) {
            this.eventEmitter.emit('skill-gap:alert', {
              userId: child.id,
              parentId: parent.family_id,
              gaps: criticalGaps.map(g => g.domain),
            });
          }
        }
      }
    }

    this.logger.log('Daily skill gap analysis completed');
  }

  generateSuggestion(domain: string): string {
    const suggestions: Record<string, string> = {
      social: "Schedule a Board Game Quest to practice social skills",
      physical: "Add a 30-minute daily walk or exercise block",
      creative: "Start an Art Quest to explore creative expression",
      academic: "Book a tutoring session to strengthen academic skills",
      entrepreneurial: "Launch a small venture project with mentor guidance",
    };
    return suggestions[domain] || "Consider trying a new activity in this domain";
  }
}
