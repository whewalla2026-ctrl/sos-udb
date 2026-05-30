import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestPillar, GoalStatus } from '../shared/prisma-enums';

describe('GoalsService', () => {
  let service: GoalsService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGoal', () => {
    it('should create a goal with default targetWeight', async () => {
      mockPrisma.goal.create.mockResolvedValue({ id: 'goal-1', title: 'Read More', targetWeight: 100 });

      const result = await service.createGoal('user-1', { title: 'Read More', pillar: QuestPillar.ACADEMIC });

      expect(result.id).toBe('goal-1');
      expect(mockPrisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Read More', targetWeight: 100 }),
        }),
      );
    });

    it('should create a goal with custom targetWeight', async () => {
      mockPrisma.goal.create.mockResolvedValue({ id: 'goal-2', title: 'Run', targetWeight: 50 });

      const result = await service.createGoal('user-1', { title: 'Run', pillar: QuestPillar.BIOMETRIC, targetWeight: 50 });

      expect(result.targetWeight).toBe(50);
    });

    it('should create a goal with dueDate', async () => {
      const due = new Date('2026-12-31');
      mockPrisma.goal.create.mockResolvedValue({ id: 'goal-3', title: 'Learn TS', dueDate: due });

      await service.createGoal('user-1', { title: 'Learn TS', pillar: QuestPillar.SKILLS, dueDate: due });

      expect(mockPrisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dueDate: due }),
        }),
      );
    });

    it('should handle prisma errors on create', async () => {
      mockPrisma.goal.create.mockRejectedValue(new Error('DB error'));

      await expect(service.createGoal('user-1', { title: 'Fail', pillar: QuestPillar.ACADEMIC })).rejects.toThrow('DB error');
    });
  });

  describe('getGoals', () => {
    it('should return all goals for user when no status filter', async () => {
      const goals = [{ id: 'g1', title: 'Goal 1' }, { id: 'g2', title: 'Goal 2' }];
      mockPrisma.goal.findMany.mockResolvedValue(goals);

      const result = await service.getGoals('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should filter goals by status when provided', async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);

      await service.getGoals('user-1', GoalStatus.ACTIVE);

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: 'ACTIVE' },
        }),
      );
    });

    it('should include quests and order by createdAt desc', async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);

      await service.getGoals('user-1');

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { quests: true }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should return empty array when user has no goals', async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);

      const result = await service.getGoals('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getProgress', () => {
    it('should calculate progress percentage', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1', currentWeight: 50, targetWeight: 100, quests: [] });

      const result = await service.getProgress('g1');

      expect(result.percentage).toBe(50);
      expect(result.goal.id).toBe('g1');
    });

    it('should return 100% when currentWeight equals targetWeight', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1', currentWeight: 100, targetWeight: 100, quests: [] });

      const result = await service.getProgress('g1');

      expect(result.percentage).toBe(100);
    });

    it('should return 0% when currentWeight is 0', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1', currentWeight: 0, targetWeight: 100, quests: [] });

      const result = await service.getProgress('g1');

      expect(result.percentage).toBe(0);
    });

    it('should throw if goal not found', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      await expect(service.getProgress('nonexistent')).rejects.toThrow('Goal not found');
    });
  });

  describe('updateGoal', () => {
    it('should update goal fields', async () => {
      mockPrisma.goal.update.mockResolvedValue({ id: 'g1', title: 'Updated', status: 'COMPLETED' });

      const result = await service.updateGoal('g1', { title: 'Updated', status: GoalStatus.COMPLETED });

      expect(result.title).toBe('Updated');
      expect(result.status).toBe('COMPLETED');
    });

    it('should update dueDate only', async () => {
      const newDue = new Date('2027-01-01');
      mockPrisma.goal.update.mockResolvedValue({ id: 'g1', dueDate: newDue });

      await service.updateGoal('g1', { dueDate: newDue });

      expect(mockPrisma.goal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'g1' },
          data: { dueDate: newDue },
        }),
      );
    });

    it('should handle prisma errors on update', async () => {
      mockPrisma.goal.update.mockRejectedValue(new Error('Not found'));

      await expect(service.updateGoal('bad-id', { title: 'Nope' })).rejects.toThrow('Not found');
    });
  });
});
