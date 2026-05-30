import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    user: { count: jest.fn(), findMany: jest.fn() },
    analyticsEvent: { create: jest.fn(), count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    onboardingStatus: { count: jest.fn(), findMany: jest.fn() },
    doterProfile: { count: jest.fn() },
    quest: { groupBy: jest.fn(), count: jest.fn() },
  };

  const mockMetrics = {
    authFailures: { inc: jest.fn() },
    signupsTotal: { inc: jest.fn() },
    activeUsers: { set: jest.fn() },
    familyLinks: { inc: jest.fn() },
    doterLevelUps: { inc: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordEvent', () => {
    it('should create an analytics event', async () => {
      const event = { id: 'evt-1', userId: 'user-1', event: 'login', metadata: { source: 'web' } };
      mockPrisma.analyticsEvent.create.mockResolvedValue(event);

      const result = await service.recordEvent('user-1', 'login', { source: 'web' });

      expect(result).toEqual(event);
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', event: 'login', metadata: { source: 'web' } },
      });
    });

    it('should default metadata to empty object', async () => {
      const event = { id: 'evt-2', userId: 'user-1', event: 'page_view', metadata: {} };
      mockPrisma.analyticsEvent.create.mockResolvedValue(event);

      const result = await service.recordEvent('user-1', 'page_view');

      expect(result).toEqual(event);
      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', event: 'page_view', metadata: {} },
      });
    });
  });

  describe('getDAU', () => {
    it('should return daily active users for given days', async () => {
      mockPrisma.user.count.mockResolvedValue(5);

      const result = await service.getDAU(3);

      expect(result).toHaveLength(3);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(3);
      result.forEach(entry => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('count');
        expect(entry.count).toBe(5);
      });
    });

    it('should return empty array for zero days', async () => {
      const result = await service.getDAU(0);
      expect(result).toEqual([]);
    });
  });

  describe('getWAU', () => {
    it('should return weekly active users for given weeks', async () => {
      mockPrisma.user.count.mockResolvedValue(10);

      const result = await service.getWAU(2);

      expect(result).toHaveLength(2);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(2);
      result.forEach(entry => {
        expect(entry).toHaveProperty('week');
        expect(entry).toHaveProperty('count');
      });
    });
  });

  describe('getMAU', () => {
    it('should return monthly active users for given months', async () => {
      mockPrisma.user.count.mockResolvedValue(20);

      const result = await service.getMAU(3);

      expect(result).toHaveLength(3);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(3);
      result.forEach(entry => {
        expect(entry).toHaveProperty('month');
        expect(entry).toHaveProperty('count');
      });
    });
  });

  describe('trackActiveUsers', () => {
    it('should count users active in last 5 minutes and set metric gauge', async () => {
      mockPrisma.user.count.mockResolvedValue(15);

      await service.trackActiveUsers();

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lastSeenAt: { gte: expect.any(Date) } },
        }),
      );
      expect(mockMetrics.activeUsers.set).toHaveBeenCalledWith({ role: 'all' }, 15);
    });

    it('should handle zero active users', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      await service.trackActiveUsers();

      expect(mockMetrics.activeUsers.set).toHaveBeenCalledWith({ role: 'all' }, 0);
    });
  });

  describe('getOverview', () => {
    it('should return aggregated overview metrics', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(10)  // dau
        .mockResolvedValueOnce(30)  // wau
        .mockResolvedValueOnce(80)  // mau
        .mockResolvedValueOnce(200) // totalUsers
        .mockResolvedValueOnce(5)   // signupsToday
        .mockResolvedValueOnce(0)   // onboarding completed
        .mockResolvedValueOnce(0);  // total onboarding
      mockPrisma.onboardingStatus.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getOverview();

      expect(result).toEqual({
        dau: 10, wau: 30, mau: 80, totalUsers: 200, signupsToday: 5,
        onboardingCompletionRate: 0, churnRate: 0,
      });
    });

    it('should calculate onboarding completion rate correctly', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.onboardingStatus.count
        .mockResolvedValueOnce(40)  // completed
        .mockResolvedValueOnce(100); // total

      const result = await service.getOverview();

      expect(result.onboardingCompletionRate).toBe(0.4);
    });
  });

  describe('getSignupConversion', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    it('should return conversion funnel data', async () => {
      mockPrisma.user.count.mockImplementation(() => Promise.resolve(100));
      mockPrisma.onboardingStatus.findMany.mockResolvedValue([
        { profileComplete: true, firstQuestDone: true },
        { profileComplete: true, firstQuestDone: false },
        { profileComplete: false, firstQuestDone: false },
      ]);

      const result = await service.getSignupConversion(startDate, endDate);

      expect(result).toHaveLength(4);
      expect(result[0].label).toBe('Signed Up');
      expect(result[1].label).toBe('Onboarding Started');
      expect(result[2].label).toBe('Profile Complete');
      expect(result[2].count).toBe(2);
      expect(result[3].label).toBe('First Quest Done');
      expect(result[3].count).toBe(1);
    });

    it('should handle zero users gracefully', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.onboardingStatus.findMany.mockResolvedValue([]);

      const result = await service.getSignupConversion(startDate, endDate);

      expect(result[0].conversionRate).toBe(1);
      expect(result[1].conversionRate).toBe(0);
      expect(result[2].conversionRate).toBe(0);
      expect(result[3].conversionRate).toBe(0);
    });
  });

  describe('getOnboardingCompletion', () => {
    it('should return completion stats', async () => {
      mockPrisma.onboardingStatus.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60);

      const result = await service.getOnboardingCompletion();

      expect(result).toEqual({ total: 100, completed: 60, rate: 0.6 });
    });

    it('should return rate 0 when no records exist', async () => {
      mockPrisma.onboardingStatus.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getOnboardingCompletion();

      expect(result).toEqual({ total: 0, completed: 0, rate: 0 });
    });
  });

  describe('getFeatureUsage', () => {
    it('should return grouped feature usage', async () => {
      mockPrisma.analyticsEvent.groupBy.mockResolvedValue([
        { event: 'quest_created', _count: { id: 10 } },
        { event: 'quest_completed', _count: { id: 5 } },
      ]);

      const result = await service.getFeatureUsage('quest', 30);

      expect(result).toEqual([
        { event: 'quest_created', usageCount: 10 },
        { event: 'quest_completed', usageCount: 5 },
      ]);
    });

    it('should return empty array when no usage', async () => {
      mockPrisma.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getFeatureUsage('quest', 30);

      expect(result).toEqual([]);
    });
  });

  describe('getFeatureUsageDaily', () => {
    it('should return daily feature usage counts', async () => {
      mockPrisma.analyticsEvent.count.mockResolvedValue(3);

      const result = await service.getFeatureUsageDaily('quest', 3);

      expect(result).toHaveLength(3);
      expect(mockPrisma.analyticsEvent.count).toHaveBeenCalledTimes(3);
      result.forEach(entry => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('count');
      });
    });

    it('should return empty array for zero days', async () => {
      const result = await service.getFeatureUsageDaily('quest', 0);
      expect(result).toEqual([]);
    });
  });

  describe('getRetention', () => {
    it('should return retention rates', async () => {
      const users = [
        { id: 'u1', createdAt: new Date('2025-01-01') },
        { id: 'u2', createdAt: new Date('2025-01-01') },
      ];
      const events = [
        { userId: 'u1', createdAt: new Date('2025-01-02') },
        { userId: 'u2', createdAt: new Date('2025-01-04') },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.analyticsEvent.findMany.mockResolvedValue(events);

      const result = await service.getRetention(30);

      expect(result).toHaveProperty('day1');
      expect(result).toHaveProperty('day3');
      expect(result).toHaveProperty('day7');
      expect(result).toHaveProperty('day14');
      expect(result).toHaveProperty('day30');
    });

    it('should return all zeros when max retention day is 0', async () => {
      const result = await service.getRetention(0);

      expect(result).toEqual({ day1: 0, day3: 0, day7: 0, day14: 0, day30: 0 });
    });
  });

  describe('getChurnIndicators', () => {
    it('should return churned users ordered by lastSeenAt', async () => {
      const churnedUsers = [
        { id: 'u1', displayName: 'User 1', email: 'u1@test.com', lastSeenAt: new Date('2024-12-01'), createdAt: new Date('2024-06-01') },
      ];
      mockPrisma.user.findMany.mockResolvedValue(churnedUsers);

      const result = await service.getChurnIndicators(30);

      expect(result).toEqual(churnedUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { lastSeenAt: 'asc' } }),
      );
    });

    it('should return empty array when no churned users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getChurnIndicators(30);

      expect(result).toEqual([]);
    });
  });

  describe('getChurnRate', () => {
    it('should calculate churn rate', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(200)  // total created before 30 days
        .mockResolvedValueOnce(30);  // churned

      const result = await service.getChurnRate();

      expect(result).toBe(0.15);
    });

    it('should return 0 when no users exist', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getChurnRate();

      expect(result).toBe(0);
    });
  });

  describe('getBillingConversion', () => {
    it('should calculate billing conversion rate', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.analyticsEvent.groupBy.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);

      const result = await service.getBillingConversion();

      expect(result).toEqual({ total: 100, paid: 2, rate: 0.02 });
    });

    it('should handle groupBy error gracefully', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.analyticsEvent.groupBy.mockRejectedValue(new Error('DB error'));

      const result = await service.getBillingConversion();

      expect(result).toEqual({ total: 100, paid: 0, rate: 0 });
    });

    it('should return rate 0 when total is 0', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.getBillingConversion();

      expect(result).toEqual({ total: 0, paid: 0, rate: 0 });
    });
  });

  describe('getActivationMetrics', () => {
    it('should return activation metrics with rates', async () => {
      mockPrisma.user.count.mockResolvedValue(200);
      mockPrisma.onboardingStatus.count.mockResolvedValue(80);
      mockPrisma.doterProfile.count.mockResolvedValue(50);
      mockPrisma.quest.groupBy.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }]);
      mockPrisma.quest.count.mockResolvedValue(20);

      const result = await service.getActivationMetrics();

      expect(result.totalUsers).toBe(200);
      expect(result.onboardingCompleted.rate).toBe(0.4);
      expect(result.doterNamed.rate).toBe(0.25);
      expect(result.questsCreated.rate).toBe(0.015);
      expect(result.questsCompleted.rate).toBe(0.1);
    });

    it('should return zero rates when no users exist', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.onboardingStatus.count.mockResolvedValue(0);
      mockPrisma.doterProfile.count.mockResolvedValue(0);
      mockPrisma.quest.groupBy.mockResolvedValue([]);
      mockPrisma.quest.count.mockResolvedValue(0);

      const result = await service.getActivationMetrics();

      expect(result.totalUsers).toBe(0);
      expect(result.onboardingCompleted.rate).toBe(0);
      expect(result.doterNamed.rate).toBe(0);
      expect(result.questsCreated.rate).toBe(0);
      expect(result.questsCompleted.rate).toBe(0);
    });
  });
});
