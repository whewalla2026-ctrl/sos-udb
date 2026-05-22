import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { QuestPillar } from '../shared/prisma-enums';

@Injectable()
export class AcademicService {
  private readonly logger = new Logger(AcademicService.name);
  constructor(private prisma: PrismaService, private uupSync: UUPSyncService) {}

  async updateSkillGap(userId: string, subject: string, pillar: QuestPillar, gapScore: number) {
    const gap = await this.prisma.skillGap.upsert({
      where: { userId_subject: { userId, subject } },
      create: { userId, subject, pillar, gapScore, lastPracticed: new Date() },
      update: { gapScore, lastPracticed: new Date() },
    });

    // Sync to UUP academic pillar
    const gaps = await this.prisma.skillGap.findMany({ where: { userId } });
    const gapMap: Record<string, number> = {};
    gaps.forEach(g => { gapMap[g.subject] = g.gapScore; });
    await this.uupSync.sync({ source: 'academic', userId, data: { academic: { skill_gaps: gapMap } as any }, actorId: userId, actorRole: 'ADMIN' });

    return gap;
  }

  async getSkillGaps(userId: string) {
    return this.prisma.skillGap.findMany({ where: { userId }, orderBy: { gapScore: 'asc' } });
  }

  async startTutoringSession(userId: string, subject: string, assignmentId?: string) {
    return this.prisma.tutoringSession.create({
      data: { userId, subject, assignmentId },
    });
  }

  async getTutoringSessions(userId: string) {
    return this.prisma.tutoringSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }
}
