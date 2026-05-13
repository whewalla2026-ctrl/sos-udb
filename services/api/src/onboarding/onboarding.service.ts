import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateStep(userId: string, step: number) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, currentStep: step },
      update: { currentStep: step },
    });
  }

  async complete(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, completed: true, currentStep: 5 },
      update: { completed: true, currentStep: 5 },
    });
  }

  async skip(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, skipped: true, completed: true, currentStep: 5 },
      update: { skipped: true, completed: true, currentStep: 5 },
    });
  }

  async updateProfileComplete(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, profileComplete: true },
      update: { profileComplete: true },
    });
  }

  async updateDoterNamed(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, doterNamed: true },
      update: { doterNamed: true },
    });
  }

  async updateFirstQuestDone(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, firstQuestDone: true },
      update: { firstQuestDone: true },
    });
  }

  async updateTourCompleted(userId: string) {
    return this.prisma.onboardingStatus.upsert({
      where: { userId },
      create: { userId, tourCompleted: true },
      update: { tourCompleted: true },
    });
  }

  async getCompletionStats() {
    const [total, completed] = await Promise.all([
      this.prisma.onboardingStatus.count(),
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
    ]);
    const completionRate = total > 0 ? completed / total : 0;

    const avgResult = await this.prisma.onboardingStatus.aggregate({
      _avg: { currentStep: true },
    });

    return {
      total,
      completed,
      completionRate,
      avgSteps: avgResult._avg.currentStep ?? 0,
    };
  }
}
