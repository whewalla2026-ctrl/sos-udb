import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WeeklyPlanService {
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async generateWeeklyPlan(userId: string) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    return this.ai.generateWeeklyPlan(userId, weekStart);
  }

  async getLatestPlan(userId: string) {
    return this.prisma.weeklyPlan.findFirst({ where: { userId }, orderBy: { weekStart: 'desc' } });
  }

  async finalizePlan(planId: string, finalPlan: any) {
    return this.prisma.weeklyPlan.update({ where: { id: planId }, data: { finalPlan, isFinalized: true } });
  }
}
