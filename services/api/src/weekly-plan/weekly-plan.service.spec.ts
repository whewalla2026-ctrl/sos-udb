import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyPlanService } from './weekly-plan.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('WeeklyPlanService', () => {
  let service: WeeklyPlanService;

  const mockPrisma = {
    weeklyPlan: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAi = {
    generateWeeklyPlan: jest.fn(),
    getCoachingInsight: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyPlanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<WeeklyPlanService>(WeeklyPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateWeeklyPlan', () => {
    const mockPlan = [
      { day: 'Monday', activities: [{ title: 'Math', pillar: 'ACADEMIC', durationMinutes: 30, isDeepWork: true, suggestedTime: '09:00' }] },
    ];

    it('should generate a weekly plan via AI', async () => {
      mockAi.generateWeeklyPlan.mockResolvedValue(mockPlan);

      const result = await service.generateWeeklyPlan('user-1');

      expect(result).toEqual(mockPlan);
      expect(mockAi.generateWeeklyPlan).toHaveBeenCalledWith('user-1', expect.any(Date));
    });

    it('should compute weekStart as Monday of current week', async () => {
      mockAi.generateWeeklyPlan.mockResolvedValue(mockPlan);

      await service.generateWeeklyPlan('user-1');

      const weekStartArg = mockAi.generateWeeklyPlan.mock.calls[0][1];
      expect(weekStartArg.getDay()).toBe(1); // Monday
      expect(weekStartArg.getHours()).toBe(0);
      expect(weekStartArg.getMinutes()).toBe(0);
      expect(weekStartArg.getSeconds()).toBe(0);
    });

    it('should propagate AI errors', async () => {
      mockAi.generateWeeklyPlan.mockRejectedValue(new Error('AI service unavailable'));

      await expect(service.generateWeeklyPlan('user-1')).rejects.toThrow('AI service unavailable');
    });
  });

  describe('getLatestPlan', () => {
    const mockPlan = { id: 'plan-1', userId: 'user-1', weekStart: new Date(), isFinalized: false };

    it('should return the latest plan for a user', async () => {
      mockPrisma.weeklyPlan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.getLatestPlan('user-1');

      expect(result).toEqual(mockPlan);
      expect(mockPrisma.weeklyPlan.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { weekStart: 'desc' },
      });
    });

    it('should return null when no plan exists', async () => {
      mockPrisma.weeklyPlan.findFirst.mockResolvedValue(null);

      const result = await service.getLatestPlan('user-1');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockPrisma.weeklyPlan.findFirst.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.getLatestPlan('user-1')).rejects.toThrow('DB connection lost');
    });
  });

  describe('finalizePlan', () => {
    const finalPlan = { days: [{ title: 'Math Review' }] };

    it('should update the plan with final data and mark finalized', async () => {
      const updated = { id: 'plan-1', userId: 'user-1', finalPlan, isFinalized: true };
      mockPrisma.weeklyPlan.update.mockResolvedValue(updated);

      const result = await service.finalizePlan('plan-1', finalPlan);

      expect(result).toEqual(updated);
      expect(mockPrisma.weeklyPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { finalPlan, isFinalized: true },
      });
    });

    it('should throw when plan is not found', async () => {
      mockPrisma.weeklyPlan.update.mockRejectedValue(new Error('Record not found'));

      await expect(service.finalizePlan('bad-id', finalPlan)).rejects.toThrow('Record not found');
    });

    it('should throw when finalPlan is invalid', async () => {
      mockPrisma.weeklyPlan.update.mockRejectedValue(new Error('Invalid data'));

      await expect(service.finalizePlan('plan-1', null)).rejects.toThrow('Invalid data');
    });
  });
});
