import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestPillar, GoalStatus } from '../shared/prisma-enums';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async createGoal(userId: string, data: { title: string; description?: string; pillar: QuestPillar; targetWeight?: number; dueDate?: Date }) {
    return this.prisma.goal.create({ data: { userId, title: data.title, description: data.description, pillar: data.pillar, targetWeight: data.targetWeight ?? 100, dueDate: data.dueDate } });
  }

  async getGoals(userId: string, status?: GoalStatus) {
    return this.prisma.goal.findMany({ where: { userId, ...(status ? { status } : {}) }, include: { quests: true }, orderBy: { createdAt: 'desc' } });
  }

  async getProgress(goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId }, include: { quests: true } });
    if (!goal) throw new Error('Goal not found');
    return { percentage: (goal.currentWeight / goal.targetWeight) * 100, goal };
  }

  async updateGoal(goalId: string, data: Partial<{ title: string; status: GoalStatus; dueDate: Date }>) {
    return this.prisma.goal.update({ where: { id: goalId }, data });
  }
}
