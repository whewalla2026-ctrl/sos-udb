import { Test, TestingModule } from '@nestjs/testing';
import { DoterService } from './doter.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { DoterState } from '../shared/prisma-enums';

describe('DoterService', () => {
  let service: DoterService;

  const mockPrisma = {
    doterProfile: { findUnique: jest.fn(), update: jest.fn() },
    notification: { create: jest.fn() },
    evolutionTrigger: { findMany: jest.fn() },
    doterReward: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    streak: { findMany: jest.fn() },
  };

  const mockMetrics = {
    inc: jest.fn(),
    doterLevelUps: { inc: jest.fn() },
    authFailures: { inc: jest.fn() },
    signupsTotal: { inc: jest.fn() },
    activeUsers: { set: jest.fn() },
    familyLinks: { inc: jest.fn() },
  };

  const baseDoter = {
    id: 'doter-1',
    userId: 'user-1',
    name: 'My Doter',
    state: DoterState.EGG,
    xp: 0,
    level: 1,
    streakDays: 0,
    debuffs: [],
    isSluggy: false,
    isEnergetic: false,
    evolutionHistory: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoterService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<DoterService>(DoterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDoter', () => {
    it('should return the doter profile', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(baseDoter);

      const result = await service.getDoter('user-1');

      expect(result).toEqual(baseDoter);
      expect(mockPrisma.doterProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('should return null when doter does not exist', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(null);

      const result = await service.getDoter('user-1');

      expect(result).toBeNull();
    });
  });

  describe('addXP', () => {
    it('should add XP and return updated doter without evolution', async () => {
      const doter = { ...baseDoter, xp: 100, state: DoterState.EGG };
      const updated = { ...doter, xp: 200, level: 1, state: DoterState.EGG };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterProfile.update.mockResolvedValue(updated);
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([]);

      const result = await service.addXP('user-1', 100);

      expect(result.doter).toEqual(updated);
      expect(result.evolved).toBe(false);
      expect(result.newState).toBeUndefined();
    });

    it('should evolve doter when XP crosses threshold', async () => {
      const doter = { ...baseDoter, xp: 0, state: DoterState.EGG };
      const updated = { ...doter, xp: 600, level: 1, state: DoterState.HATCHLING, evolutionHistory: [{
        from: DoterState.EGG, to: DoterState.HATCHLING, at: expect.any(String), xpAtEvolution: 600,
      }] };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterProfile.update.mockResolvedValue(updated);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([]);

      const result = await service.addXP('user-1', 600);

      expect(result.evolved).toBe(true);
      expect(result.newState).toBe(DoterState.HATCHLING);
      expect(mockMetrics.doterLevelUps.inc).toHaveBeenCalledWith({ level: DoterState.HATCHLING });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', type: 'DOTER_EVOLVED' }) }),
      );
    });

    it('should throw when doter not found', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(null);

      await expect(service.addXP('user-1', 100)).rejects.toThrow('Doter not found');
    });

    it('should include rewards when triggers are met', async () => {
      const doter = { ...baseDoter, xp: 500, state: DoterState.EGG };
      const updated = { ...doter, xp: 600, level: 1, state: DoterState.EGG };
      const reward = { id: 'reward-1', userId: 'user-1', type: 'BADGE', name: 'First Steps', tier: 'BRONZE' };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterProfile.update.mockResolvedValue(updated);
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([{
        id: 'trig-1', name: 'First Steps', description: 'Earn your first XP',
        condition: { type: 'XP', threshold: 500 },
        effect: { badge: true },
        active: true,
      }]);
      mockPrisma.doterReward.findFirst.mockResolvedValue(null);
      mockPrisma.doterReward.create.mockResolvedValue(reward);

      const result = await service.addXP('user-1', 100);

      expect(result.rewards).toEqual([reward]);
    });
  });

  describe('checkRewards', () => {
    it('should return earned rewards for XP triggers', async () => {
      const reward = { id: 'reward-1', userId: 'user-1', type: 'BADGE', name: 'XP Master', tier: 'SILVER' };
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([{
        id: 'trig-1', name: 'XP Master', description: 'Reach 5000 XP',
        condition: { type: 'XP', threshold: 5000 },
        effect: { badge: true },
        active: true,
      }]);
      mockPrisma.doterReward.findFirst.mockResolvedValue(null);
      mockPrisma.doterReward.create.mockResolvedValue(reward);

      const result = await service.checkRewards('user-1', 5000, DoterState.ADOLESCENT);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('XP Master');
    });

    it('should return earned rewards for STREAK triggers', async () => {
      const reward = { id: 'reward-2', userId: 'user-1', type: 'BADGE', name: 'Streak King', tier: 'BRONZE' };
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([{
        id: 'trig-2', name: 'Streak King', description: '7-day streak',
        condition: { type: 'STREAK', threshold: 7 },
        effect: { badge: true },
        active: true,
      }]);
      mockPrisma.doterReward.findFirst.mockResolvedValue(null);
      mockPrisma.doterProfile.findUnique.mockResolvedValue({ ...baseDoter, streakDays: 7 });
      mockPrisma.doterReward.create.mockResolvedValue(reward);

      const result = await service.checkRewards('user-1', 100, DoterState.EGG);

      expect(result).toHaveLength(1);
    });

    it('should skip already-awarded triggers', async () => {
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([{
        id: 'trig-1', name: 'XP Master', description: 'Reach 5000 XP',
        condition: { type: 'XP', threshold: 5000 },
        effect: { badge: true },
        active: true,
      }]);
      mockPrisma.doterReward.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.checkRewards('user-1', 5000, DoterState.ADOLESCENT);

      expect(result).toEqual([]);
    });

    it('should use GOLD tier for thresholds > 10000', async () => {
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue([{
        id: 'trig-1', name: 'Legendary', description: 'Legendary XP',
        condition: { type: 'XP', threshold: 15000 },
        effect: { badge: true },
        active: true,
      }]);
      mockPrisma.doterReward.findFirst.mockResolvedValue(null);
      mockPrisma.doterReward.create.mockResolvedValue({ id: 'r', tier: 'GOLD' });

      const result = await service.checkRewards('user-1', 15000, DoterState.LEGENDARY);

      expect(mockPrisma.doterReward.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tier: 'GOLD' }) }),
      );
    });
  });

  describe('getRewards', () => {
    it('should return rewards ordered by earnedAt desc', async () => {
      const rewards = [{ id: 'r1', userId: 'user-1', earnedAt: new Date('2025-01-02') }];
      mockPrisma.doterReward.findMany.mockResolvedValue(rewards);

      const result = await service.getRewards('user-1');

      expect(result).toEqual(rewards);
      expect(mockPrisma.doterReward.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { earnedAt: 'desc' },
      });
    });
  });

  describe('getEvolutionTriggers', () => {
    it('should return active evolution triggers', async () => {
      const triggers = [{ id: 'trig-1', active: true }];
      mockPrisma.evolutionTrigger.findMany.mockResolvedValue(triggers);

      const result = await service.getEvolutionTriggers();

      expect(result).toEqual(triggers);
      expect(mockPrisma.evolutionTrigger.findMany).toHaveBeenCalledWith({ where: { active: true } });
    });
  });

  describe('applyDebuff', () => {
    it('should apply a debuff to the doter', async () => {
      const doter = { ...baseDoter, debuffs: [] };
      const updated = { ...doter, debuffs: ['SLUGGISH_STATE'], isSluggy: true };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterProfile.update.mockResolvedValue(updated);

      await service.applyDebuff('user-1', 'SLUGGISH_STATE');

      expect(mockPrisma.doterProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { debuffs: ['SLUGGISH_STATE'], isSluggy: true },
      });
    });

    it('should not add duplicate debuffs', async () => {
      const doter = { ...baseDoter, debuffs: ['SLUGGISH_STATE'], isSluggy: true };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);

      await service.applyDebuff('user-1', 'SLUGGISH_STATE');

      expect(mockPrisma.doterProfile.update).not.toHaveBeenCalled();
    });

    it('should do nothing when doter does not exist', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(null);

      await service.applyDebuff('user-1', 'SLUGGISH_STATE');

      expect(mockPrisma.doterProfile.update).not.toHaveBeenCalled();
    });
  });

  describe('removeDebuff', () => {
    it('should remove a debuff from the doter', async () => {
      const doter = { ...baseDoter, debuffs: ['SLUGGISH_STATE', 'WEAKENED'] };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterProfile.update.mockResolvedValue({ ...doter, debuffs: ['WEAKENED'] });

      await service.removeDebuff('user-1', 'SLUGGISH_STATE');

      expect(mockPrisma.doterProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { debuffs: ['WEAKENED'] },
      });
    });

    it('should do nothing when doter does not exist', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(null);

      await service.removeDebuff('user-1', 'SLUGGISH_STATE');

      expect(mockPrisma.doterProfile.update).not.toHaveBeenCalled();
    });
  });

  describe('nameDoter', () => {
    it('should update the doter name', async () => {
      const updated = { ...baseDoter, name: 'Fluffy' };
      mockPrisma.doterProfile.update.mockResolvedValue(updated);

      const result = await service.nameDoter('user-1', 'Fluffy');

      expect(result).toEqual(updated);
      expect(mockPrisma.doterProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { name: 'Fluffy' },
      });
    });
  });

  describe('incrementStreak', () => {
    it('should increment streak days', async () => {
      const doter = { ...baseDoter, streakDays: 5 };
      const updated = { ...doter, streakDays: 6 };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterProfile.update.mockResolvedValue(updated);

      const result = await service.incrementStreak('user-1');

      expect(result!.streakDays).toBe(6);
      expect(mockPrisma.doterProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { streakDays: 6 },
      });
    });

    it('should do nothing when doter does not exist', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(null);

      const result = await service.incrementStreak('user-1');

      expect(result).toBeUndefined();
      expect(mockPrisma.doterProfile.update).not.toHaveBeenCalled();
    });
  });

  describe('getGamificationAnalytics', () => {
    it('should return analytics for existing doter', async () => {
      const doter = { ...baseDoter, name: 'Fluffy', state: DoterState.HATCHLING, level: 2, xp: 800, streakDays: 3, isEnergetic: false, isSluggy: false };
      const rewards = [{ id: 'r1' }, { id: 'r2' }];
      const streaks = [{ currentDays: 3 }, { currentDays: 5 }];
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterReward.findMany.mockResolvedValue(rewards);
      mockPrisma.streak.findMany.mockResolvedValue(streaks);

      const result = await service.getGamificationAnalytics('user-1');

      expect(result).toEqual({
        name: 'Fluffy', state: DoterState.HATCHLING, level: 2, xp: 800,
        streakDays: 3, avgStreakDays: 4, totalRewards: 2, isEnergetic: false, isSluggy: false,
      });
    });

    it('should return null when doter does not exist', async () => {
      mockPrisma.doterProfile.findUnique.mockResolvedValue(null);

      const result = await service.getGamificationAnalytics('user-1');

      expect(result).toBeNull();
    });

    it('should return avgStreakDays 0 when no streaks', async () => {
      const doter = { ...baseDoter, name: 'Fluffy' };
      mockPrisma.doterProfile.findUnique.mockResolvedValue(doter);
      mockPrisma.doterReward.findMany.mockResolvedValue([]);
      mockPrisma.streak.findMany.mockResolvedValue([]);

      const result = await service.getGamificationAnalytics('user-1');

      expect(result!.avgStreakDays).toBe(0);
    });
  });
});
