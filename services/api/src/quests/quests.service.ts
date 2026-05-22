import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { PointsService } from '../points/points.service';
import { MetricsService } from '../shared/metrics.controller';
import { QuestStatus, QuestPillar } from '../shared/prisma-enums';
import { UserRole } from '../shared/user-role';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private points: PointsService,
    private metrics: MetricsService,
  ) {}

  async createQuest(userId: string, data: {
    title: string;
    description?: string;
    pillar: QuestPillar;
    xpReward?: number;
    coinReward?: number;
    goalId?: string;
    masteryWeight?: number;
    dueDate?: Date;
    metadata?: Record<string, any>;
  }) {
    const quest = await this.prisma.quest.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        pillar: data.pillar,
        xpReward: data.xpReward ?? 100,
        coinReward: data.coinReward ?? 50,
        goalId: data.goalId,
        masteryWeight: data.masteryWeight ?? 0,
        dueDate: data.dueDate,
        metadata: data.metadata ?? {},
      },
    });

    this.logger.log(`📋 Quest created: ${quest.title} for user ${userId}`);
    return quest;
  }

  // Create ADHD Micro-Quest chunks (Task Chunking feature)
  async createMicroQuests(userId: string, parentQuestData: {
    title: string;
    pillar: QuestPillar;
    totalDurationMinutes: number;
    chunkDurationMinutes?: number;
  }) {
    const { title, pillar, totalDurationMinutes, chunkDurationMinutes = 10 } = parentQuestData;
    const chunks = Math.ceil(totalDurationMinutes / chunkDurationMinutes);

    // Create parent quest
    const parentQuest = await this.createQuest(userId, {
      title,
      pillar,
      metadata: { isAdhdChunked: true, totalChunks: chunks },
    });

    // Create chunk quests
    const chunkQuests = [];
    for (let i = 0; i < chunks; i++) {
      const chunk: any = await this.prisma.quest.create({
        data: {
          userId,
          title: `${title} — Sprint ${i + 1}/${chunks}`,
          pillar,
          isChunk: true,
          parentQuestId: parentQuest.id,
          chunkIndex: i,
          xpReward: Math.floor(100 / chunks),
          coinReward: Math.floor(50 / chunks),
          metadata: { durationMinutes: chunkDurationMinutes },
        },
      });
      (chunkQuests as any).push(chunk);
    }

    this.logger.log(`🧩 Created ${chunks} micro-quests for ADHD chunking: ${title}`);
    return { parentQuest, chunks: chunkQuests };
  }

  async submitQuest(questId: string, userId: string, proofUrl: string, proofType: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException(`Quest ${questId} not found`);
    if (quest.userId !== userId) throw new ForbiddenException();

    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: QuestStatus.SUBMITTED,
        proofUrl,
        proofType,
        updatedAt: new Date(),
      },
    });
  }

  async approveQuest(questId: string, approverId: string, aiConfidence?: number) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException();
    const approver = await this.prisma.user.findUnique({ where: { id: approverId }, select: { id: true, role: true } });
    if (!approver) throw new ForbiddenException();
    const isOwner = approver.id === quest.userId;
    const isAdmin = approver.role === UserRole.ADMIN;
    const isParent = approver.role === UserRole.PARENT && await this.prisma.familyLink.findFirst({
      where: { parentId: approver.id, childId: quest.userId },
    }).then(Boolean);
    if (!isOwner && !isAdmin && !isParent) throw new ForbiddenException();

    // Approve quest
    const updated = await this.prisma.quest.update({
      where: { id: questId },
      data: {
        status: QuestStatus.APPROVED,
        aiConfidence,
        aiVerified: !!aiConfidence,
        updatedAt: new Date(),
      },
    });

    // Award XP + Coins via Points Ledger
    await this.points.awardPoints(quest.userId, {
      amount: quest.xpReward,
      source: 'QUEST',
      sourceId: questId,
      description: `Quest completed: ${quest.title}`,
    });

    // Update Goal progress if mapped
    if (quest.goalId && quest.masteryWeight > 0) {
      await this.updateGoalProgress(quest.goalId, quest.masteryWeight);
    }

    // Sync UUP gamification pillar
    const user = await this.prisma.user.findUnique({ where: { id: quest.userId } });
    const uup = user?.uupData as any;
    await this.uupSync.sync({
      source: 'gamification',
      userId: quest.userId,
      data: {
        gamification: {
          xp: (uup?.gamification?.xp ?? 0) + quest.xpReward,
          coin_balance: (uup?.gamification?.coin_balance ?? 0) + quest.coinReward,
        } as any,
      },
      actorId: approverId,
      actorRole: 'ADMIN',
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        actorId: approverId,
        action: 'QUEST_APPROVE',
        targetType: 'Quest',
        targetId: questId,
        payload: { xpAwarded: quest.xpReward, coinAwarded: quest.coinReward },
      },
    });

    this.metrics.questsCompleted.inc({ pillar: quest.pillar });
    this.logger.log(`✅ Quest approved: ${quest.title} (+${quest.xpReward}XP, +${quest.coinReward} coins)`);
    return updated;
  }

  private async updateGoalProgress(goalId: string, weight: number) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) return;

    const newWeight = Math.min(goal.currentWeight + weight, goal.targetWeight);
    const isComplete = newWeight >= goal.targetWeight;

    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        currentWeight: newWeight,
        status: isComplete ? 'COMPLETED' : 'ACTIVE',
        completedAt: isComplete ? new Date() : null,
      },
    });

    if (isComplete) {
      this.metrics.goalCompletions.inc({ pillar: goal.pillar });
      this.logger.log(`🏆 Goal COMPLETED: ${goalId}`);
      // Trigger celebration protocol
      await this.prisma.notification.create({
        data: {
          userId: goal.userId,
          type: 'GOAL_COMPLETE',
          title: '🏆 Goal Achieved!',
          body: `Congratulations! You've completed "${goal.title}"! Your certificate is ready.`,
          data: { goalId },
        },
      });
    }
  }

  async getUserQuests(userId: string, filters?: { status?: QuestStatus; pillar?: QuestPillar }) {
    return this.prisma.quest.findMany({
      where: { userId, ...filters, isChunk: false },
      orderBy: { createdAt: 'desc' },
      include: { evidenceItems: true },
    });
  }

  async getQuestById(questId: string, userId?: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      include: { chunks: true, evidenceItems: true, goal: true },
    });
    if (!quest) throw new NotFoundException();
    if (userId && quest.userId !== userId) throw new ForbiddenException();
    return quest;
  }
}
