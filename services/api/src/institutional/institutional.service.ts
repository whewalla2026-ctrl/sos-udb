import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeacherDashboard {
  schoolId: string;
  cohortMetrics: {
    questCompletionRate: number;
    skillDistribution: Record<string, number>;
    engagementTrend: { date: string; value: number }[];
  };
  availableQuests: any[];
}

export interface DPAGateResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class InstitutionalService {
  constructor(private prisma: PrismaService) {}

  async verifyDPA(schoolId: string): Promise<DPAGateResult> {
    const dpa = await this.prisma.$queryRaw<any[]>`
      SELECT signed_at, expires_at FROM school_dpas
      WHERE school_id = ${schoolId} AND expires_at > NOW()
      LIMIT 1
    `;

    if (dpa.length === 0) {
      return { allowed: false, reason: 'DPA expired or not signed' };
    }

    return { allowed: true };
  }

  async getTeacherDashboard(teacherId: string): Promise<TeacherDashboard> {
    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } });
    const schoolId = (teacher as any)?.schoolId;

    if (!schoolId) {
      throw new Error('Teacher not associated with a school');
    }

    const dpaCheck = await this.verifyDPA(schoolId);
    if (!dpaCheck.allowed) {
      throw new Error(dpaCheck.reason);
    }

    const cohortMetrics = await this.getCohortMetrics(schoolId);
    const availableQuests = await this.getAvailableQuests();

    return { schoolId, cohortMetrics, availableQuests };
  }

  private async getCohortMetrics(schoolId: string): Promise<any> {
    const questCompletion = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(completion_rate) as rate FROM school_metrics
      WHERE school_id = ${schoolId}
    `;

    return {
      questCompletionRate: questCompletion[0]?.rate || 0,
      skillDistribution: { academic: 0.4, physical: 0.2, social: 0.2, creative: 0.1, entrepreneurial: 0.1 },
      engagementTrend: [],
    };
  }

  private async getAvailableQuests(): Promise<any[]> {
    return [];
  }

  async getCohortSize(schoolId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM users WHERE school_id = ${schoolId}
    `;
    return Number(result[0]?.count || 0);
  }

  async assignQuestToClass(questId: string, classId: string, teacherId: string): Promise<void> {
    const classStudents = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM users WHERE class_id = ${classId} AND role = 'CHILD'
    `;

    for (const student of classStudents) {
      await this.prisma.$executeRaw`
        INSERT INTO quest_assignments (id, quest_id, user_id, status, assigned_by, created_at)
        VALUES (gen_random_uuid(), ${questId}, ${student.id}, 'PENDING_PARENT_APPROVAL', ${teacherId}, NOW())
      `;
    }
  }
}
