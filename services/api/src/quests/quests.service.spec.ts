import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { PointsService } from '../points/points.service';
import { MetricsService } from '../shared/metrics.controller';
import { QuestStatus, QuestPillar } from '../shared/prisma-enums';
import { UserRole } from '../shared/user-role';

describe('QuestsService', () => {
  let service: QuestsService;

  const mockPrisma = {
    quest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    familyLink: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    goal: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUupSync = {
    getUUP: jest.fn(),
    sync: jest.fn(),
  };

  const mockPoints = {
    awardPoints: jest.fn(),
    awardXP: jest.fn(),
    awardCoins: jest.fn(),
    getBalance: jest.fn(),
  };

  const mockMetrics = {
    questsCompleted: { inc: jest.fn() },
    goalCompletions: { inc: jest.fn() },
    signupsTotal: { inc: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UUPSyncService, useValue: mockUupSync },
        { provide: PointsService, useValue: mockPoints },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<QuestsService>(QuestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createQuest', () => {
    const questData = {
      title: 'Master Algebra',
      description: 'Complete 10 algebra problems',
      pillar: QuestPillar.ACADEMIC,
      xpReward: 200,
      coinReward: 100,
      goalId: 'goal-1',
      masteryWeight: 0.5,
      dueDate: new Date('2025-02-01'),
      metadata: { difficulty: 'hard' },
    };

    it('should create a quest with all fields', async () => {
      mockPrisma.quest.create.mockResolvedValue({
        id: 'q-1',
        userId: 'user-1',
        ...questData,
        createdAt: new Date(),
      });

      const result = await service.createQuest('user-1', questData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Master Algebra');
      expect(mockPrisma.quest.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Master Algebra',
          description: 'Complete 10 algebra problems',
          pillar: QuestPillar.ACADEMIC,
          xpReward: 200,
          coinReward: 100,
          goalId: 'goal-1',
          masteryWeight: 0.5,
          dueDate: questData.dueDate,
          metadata: { difficulty: 'hard' },
        },
      });
    });

    it('should use default values for optional fields', async () => {
      mockPrisma.quest.create.mockResolvedValue({
        id: 'q-2',
        userId: 'user-1',
        title: 'Simple Quest',
        pillar: QuestPillar.BIOMETRIC,
        xpReward: 100,
        coinReward: 50,
        masteryWeight: 0,
        metadata: {},
      });

      const result = await service.createQuest('user-1', {
        title: 'Simple Quest',
        pillar: QuestPillar.BIOMETRIC,
      });

      expect(result.xpReward).toBe(100);
      expect(result.coinReward).toBe(50);
      expect(result.masteryWeight).toBe(0);
    });

    it('should propagate database errors', async () => {
      mockPrisma.quest.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createQuest('user-1', { title: 'Fail', pillar: QuestPillar.ACADEMIC }),
      ).rejects.toThrow('DB error');
    });
  });

  describe('createMicroQuests', () => {
    const microData = {
      title: 'Read a Book',
      pillar: QuestPillar.ACADEMIC,
      totalDurationMinutes: 30,
      chunkDurationMinutes: 10,
    };

    it('should create parent quest and chunk quests', async () => {
      mockPrisma.quest.create
        .mockResolvedValueOnce({
          id: 'parent-1',
          userId: 'user-1',
          title: 'Read a Book',
          pillar: QuestPillar.ACADEMIC,
          metadata: { isAdhdChunked: true, totalChunks: 3 },
        })
        .mockResolvedValueOnce({
          id: 'chunk-1',
          userId: 'user-1',
          title: 'Read a Book — Sprint 1/3',
          pillar: QuestPillar.ACADEMIC,
          isChunk: true,
          parentQuestId: 'parent-1',
          chunkIndex: 0,
          xpReward: 33,
          coinReward: 16,
        })
        .mockResolvedValueOnce({
          id: 'chunk-2',
          userId: 'user-1',
          title: 'Read a Book — Sprint 2/3',
          pillar: QuestPillar.ACADEMIC,
          isChunk: true,
          parentQuestId: 'parent-1',
          chunkIndex: 1,
          xpReward: 33,
          coinReward: 16,
        })
        .mockResolvedValueOnce({
          id: 'chunk-3',
          userId: 'user-1',
          title: 'Read a Book — Sprint 3/3',
          pillar: QuestPillar.ACADEMIC,
          isChunk: true,
          parentQuestId: 'parent-1',
          chunkIndex: 2,
          xpReward: 34,
          coinReward: 18,
        });

      const result = await service.createMicroQuests('user-1', microData);

      expect(result).toHaveProperty('parentQuest');
      expect(result).toHaveProperty('chunks');
      expect(result.chunks).toHaveLength(3);
      expect(mockPrisma.quest.create).toHaveBeenCalledTimes(4);
    });

    it('should use default chunk duration of 10 minutes', async () => {
      mockPrisma.quest.create
        .mockResolvedValueOnce({ id: 'parent-2', title: 'Quick Task', metadata: {} })
        .mockResolvedValueOnce({ id: 'chunk-1', title: 'Quick Task — Sprint 1/1' });

      const result = await service.createMicroQuests('user-1', {
        title: 'Quick Task',
        pillar: QuestPillar.SOCIAL,
        totalDurationMinutes: 5,
      });

      expect(result.chunks).toHaveLength(1);
    });

    it('should handle single chunk task', async () => {
      mockPrisma.quest.create
        .mockResolvedValueOnce({ id: 'parent-3', title: 'Mini Task', metadata: {} })
        .mockResolvedValueOnce({ id: 'chunk-1', title: 'Mini Task — Sprint 1/1' });

      const result = await service.createMicroQuests('user-1', {
        title: 'Mini Task',
        pillar: QuestPillar.LIFE_SKILLS,
        totalDurationMinutes: 8,
        chunkDurationMinutes: 10,
      });

      expect(result.chunks).toHaveLength(1);
    });
  });

  describe('submitQuest', () => {
    it('should submit a quest with proof', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue({
        id: 'q-1',
        userId: 'user-1',
        status: QuestStatus.PENDING,
      });
      mockPrisma.quest.update.mockResolvedValue({
        id: 'q-1',
        status: QuestStatus.SUBMITTED,
        proofUrl: 'https://example.com/proof.pdf',
        proofType: 'PDF',
      });

      const result = await service.submitQuest('q-1', 'user-1', 'https://example.com/proof.pdf', 'PDF');

      expect(result.status).toBe(QuestStatus.SUBMITTED);
      expect(mockPrisma.quest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-1' },
          data: expect.objectContaining({
            status: QuestStatus.SUBMITTED,
            proofUrl: 'https://example.com/proof.pdf',
            proofType: 'PDF',
          }),
        }),
      );
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(null);

      await expect(
        service.submitQuest('nonexistent', 'user-1', 'url', 'PDF'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the quest', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue({
        id: 'q-1',
        userId: 'user-2',
      });

      await expect(
        service.submitQuest('q-1', 'user-1', 'url', 'PDF'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle empty proof URL', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue({
        id: 'q-1',
        userId: 'user-1',
      });
      mockPrisma.quest.update.mockResolvedValue({
        id: 'q-1',
        status: QuestStatus.SUBMITTED,
        proofUrl: '',
        proofType: '',
      });

      const result = await service.submitQuest('q-1', 'user-1', '', '');

      expect(result.status).toBe(QuestStatus.SUBMITTED);
    });
  });

  describe('approveQuest', () => {
    const questFixture = {
      id: 'q-1',
      userId: 'user-1',
      title: 'Algebra Quest',
      pillar: QuestPillar.ACADEMIC,
      xpReward: 200,
      coinReward: 100,
      goalId: 'goal-1',
      masteryWeight: 0.5,
      status: QuestStatus.SUBMITTED,
    };

    it('should approve quest and award points', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(questFixture);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: UserRole.ADMIN })
        .mockResolvedValueOnce({ id: 'user-1', uupData: { gamification: { xp: 500, coin_balance: 200 } } });
      mockPoints.awardPoints.mockResolvedValue({ id: 'tx-1', amount: 200 });
      mockPrisma.quest.update.mockResolvedValue({
        ...questFixture,
        status: QuestStatus.APPROVED,
        aiConfidence: 0.95,
        aiVerified: true,
      });
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
      mockPrisma.goal.findUnique.mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
        title: 'Math Goal',
        currentWeight: 0.3,
        targetWeight: 1.0,
        pillar: QuestPillar.ACADEMIC,
      });
      mockPrisma.goal.update.mockResolvedValue({
        id: 'goal-1',
        currentWeight: 0.8,
        status: 'ACTIVE',
      });

      const result = await service.approveQuest('q-1', 'admin-1', 0.95);

      expect(result.status).toBe(QuestStatus.APPROVED);
      expect(result.aiConfidence).toBe(0.95);
      expect(mockPoints.awardPoints).toHaveBeenCalledWith('user-1', {
        amount: 200,
        source: 'QUEST',
        sourceId: 'q-1',
        description: 'Quest completed: Algebra Quest',
      });
      expect(mockUupSync.sync).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(mockMetrics.questsCompleted.inc).toHaveBeenCalledWith({ pillar: QuestPillar.ACADEMIC });
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(null);

      await expect(service.approveQuest('nonexistent', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when approver not found', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(questFixture);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.approveQuest('q-1', 'unknown')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when approver has no role', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(questFixture);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'stranger', role: UserRole.CHILD });
      mockPrisma.familyLink.findFirst.mockResolvedValue(null);

      await expect(service.approveQuest('q-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('should allow parent to approve child quest', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(questFixture);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'parent-1', role: UserRole.PARENT })
        .mockResolvedValueOnce({ id: 'user-1', uupData: {} });
      mockPrisma.familyLink.findFirst.mockResolvedValue({ id: 'fl-1', parentId: 'parent-1', childId: 'user-1' });
      mockPrisma.quest.update.mockResolvedValue({ ...questFixture, status: QuestStatus.APPROVED });
      mockPoints.awardPoints.mockResolvedValue({ id: 'tx-1' });
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.approveQuest('q-1', 'parent-1');

      expect(result.status).toBe(QuestStatus.APPROVED);
    });

    it('should handle quest without goalId', async () => {
      const questNoGoal = { ...questFixture, goalId: null, masteryWeight: 0 };
      mockPrisma.quest.findUnique.mockResolvedValue(questNoGoal);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: UserRole.ADMIN })
        .mockResolvedValueOnce({ id: 'user-1', uupData: {} });
      mockPrisma.quest.update.mockResolvedValue({ ...questNoGoal, status: QuestStatus.APPROVED });
      mockPoints.awardPoints.mockResolvedValue({ id: 'tx-1' });
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.approveQuest('q-1', 'admin-1');

      expect(result.status).toBe(QuestStatus.APPROVED);
      expect(mockPrisma.goal.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getUserQuests', () => {
    it('should return quests for a user ordered by creation date', async () => {
      const mockQuests = [
        { id: 'q-1', title: 'Recent Quest', createdAt: new Date('2025-01-10'), evidenceItems: [] },
        { id: 'q-2', title: 'Older Quest', createdAt: new Date('2025-01-05'), evidenceItems: [] },
      ];
      mockPrisma.quest.findMany.mockResolvedValue(mockQuests);

      const result = await service.getUserQuests('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.quest.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isChunk: false },
        orderBy: { createdAt: 'desc' },
        include: { evidenceItems: true },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrisma.quest.findMany.mockResolvedValue([]);

      await service.getUserQuests('user-1', { status: QuestStatus.APPROVED });

      expect(mockPrisma.quest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: QuestStatus.APPROVED }),
        }),
      );
    });

    it('should filter by pillar when provided', async () => {
      mockPrisma.quest.findMany.mockResolvedValue([]);

      await service.getUserQuests('user-1', { pillar: QuestPillar.BIOMETRIC });

      expect(mockPrisma.quest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pillar: QuestPillar.BIOMETRIC }),
        }),
      );
    });

    it('should return empty array when user has no quests', async () => {
      mockPrisma.quest.findMany.mockResolvedValue([]);

      const result = await service.getUserQuests('user-1');

      expect(result).toEqual([]);
    });

    it('should exclude chunk quests by default', async () => {
      mockPrisma.quest.findMany.mockResolvedValue([]);

      await service.getUserQuests('user-1');

      expect(mockPrisma.quest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isChunk: false }),
        }),
      );
    });
  });

  describe('getQuestById', () => {
    it('should return quest with chunks, evidence, and goal', async () => {
      const mockQuest = {
        id: 'q-1',
        userId: 'user-1',
        title: 'Algebra Quest',
        chunks: [],
        evidenceItems: [],
        goal: { id: 'goal-1', title: 'Math Goal' },
      };
      mockPrisma.quest.findUnique.mockResolvedValue(mockQuest);

      const result = await service.getQuestById('q-1');

      expect(result).toEqual(mockQuest);
      expect(mockPrisma.quest.findUnique).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        include: { chunks: true, evidenceItems: true, goal: true },
      });
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue(null);

      await expect(service.getQuestById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when userId does not match', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue({
        id: 'q-1',
        userId: 'user-2',
      });

      await expect(service.getQuestById('q-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when userId matches', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue({
        id: 'q-1',
        userId: 'user-1',
        chunks: [],
        evidenceItems: [],
        goal: null,
      });

      const result = await service.getQuestById('q-1', 'user-1');

      expect(result).toBeDefined();
    });

    it('should allow access when no userId filter is provided', async () => {
      mockPrisma.quest.findUnique.mockResolvedValue({
        id: 'q-1',
        userId: 'user-1',
        chunks: [],
        evidenceItems: [],
        goal: null,
      });

      const result = await service.getQuestById('q-1');

      expect(result).toBeDefined();
    });
  });
});
