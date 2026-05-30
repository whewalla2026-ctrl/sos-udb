import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OnboardingService', () => {
  let service: OnboardingService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    onboardingStatus: {
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should upsert and return onboarding status', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', currentStep: 0, completed: false });

      const result = await service.getStatus('user-1');

      expect(result.userId).toBe('user-1');
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1' },
        update: {},
      });
    });

    it('should create new entry for first-time user', async () => {
      const newEntry = { userId: 'new-user', currentStep: 0, completed: false, skipped: false };
      mockPrisma.onboardingStatus.upsert.mockResolvedValue(newEntry);

      const result = await service.getStatus('new-user');

      expect(result).toEqual(newEntry);
    });

    it('should return existing status for returning user (update empty)', async () => {
      const existing = { userId: 'user-1', currentStep: 3, completed: false };
      mockPrisma.onboardingStatus.upsert.mockResolvedValue(existing);

      const result = await service.getStatus('user-1');

      expect(result.currentStep).toBe(3);
    });
  });

  describe('updateStep', () => {
    it('should upsert with currentStep', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', currentStep: 2 });

      const result = await service.updateStep('user-1', 2);

      expect(result.currentStep).toBe(2);
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', currentStep: 2 },
        update: { currentStep: 2 },
      });
    });

    it('should handle initial step 0', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', currentStep: 0 });

      const result = await service.updateStep('user-1', 0);

      expect(result.currentStep).toBe(0);
    });

    it('should allow updating to a later step', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', currentStep: 4 });

      const result = await service.updateStep('user-1', 4);

      expect(result.currentStep).toBe(4);
    });
  });

  describe('complete', () => {
    it('should set completed true and currentStep 5', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', completed: true, currentStep: 5 });

      const result = await service.complete('user-1');

      expect(result.completed).toBe(true);
      expect(result.currentStep).toBe(5);
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', completed: true, currentStep: 5 },
        update: { completed: true, currentStep: 5 },
      });
    });

    it('should mark already-completed user again without error', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', completed: true, currentStep: 5 });

      const result = await service.complete('user-1');

      expect(result.completed).toBe(true);
    });
  });

  describe('skip', () => {
    it('should set skipped, completed, and currentStep 5', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', skipped: true, completed: true, currentStep: 5 });

      const result = await service.skip('user-1');

      expect(result.skipped).toBe(true);
      expect(result.completed).toBe(true);
      expect(result.currentStep).toBe(5);
    });

    it('should allow skip after already having progress', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', skipped: true, completed: true, currentStep: 5 });

      const result = await service.skip('user-1');

      expect(result.completed).toBe(true);
    });
  });

  describe('updateProfileComplete', () => {
    it('should set profileComplete true', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', profileComplete: true });

      const result = await service.updateProfileComplete('user-1');

      expect(result.profileComplete).toBe(true);
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', profileComplete: true },
        update: { profileComplete: true },
      });
    });

    it('should be idempotent', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', profileComplete: true });

      await service.updateProfileComplete('user-1');
      await service.updateProfileComplete('user-1');

      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateDoterNamed', () => {
    it('should set doterNamed true', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', doterNamed: true });

      const result = await service.updateDoterNamed('user-1');

      expect(result.doterNamed).toBe(true);
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', doterNamed: true },
        update: { doterNamed: true },
      });
    });
  });

  describe('updateFirstQuestDone', () => {
    it('should set firstQuestDone true', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', firstQuestDone: true });

      const result = await service.updateFirstQuestDone('user-1');

      expect(result.firstQuestDone).toBe(true);
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', firstQuestDone: true },
        update: { firstQuestDone: true },
      });
    });
  });

  describe('updateTourCompleted', () => {
    it('should set tourCompleted true', async () => {
      mockPrisma.onboardingStatus.upsert.mockResolvedValue({ userId: 'user-1', tourCompleted: true });

      const result = await service.updateTourCompleted('user-1');

      expect(result.tourCompleted).toBe(true);
      expect(mockPrisma.onboardingStatus.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', tourCompleted: true },
        update: { tourCompleted: true },
      });
    });
  });

  describe('getCompletionStats', () => {
    it('should return stats with completion rate and avg steps', async () => {
      mockPrisma.onboardingStatus.count.mockResolvedValueOnce(100);
      mockPrisma.onboardingStatus.count.mockResolvedValueOnce(75);
      mockPrisma.onboardingStatus.aggregate.mockResolvedValue({ _avg: { currentStep: 3.5 } });

      const result = await service.getCompletionStats();

      expect(result.total).toBe(100);
      expect(result.completed).toBe(75);
      expect(result.completionRate).toBe(0.75);
      expect(result.avgSteps).toBe(3.5);
    });

    it('should return 0 completion rate when total is 0', async () => {
      mockPrisma.onboardingStatus.count.mockResolvedValueOnce(0);
      mockPrisma.onboardingStatus.count.mockResolvedValueOnce(0);
      mockPrisma.onboardingStatus.aggregate.mockResolvedValue({ _avg: { currentStep: null } });

      const result = await service.getCompletionStats();

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.avgSteps).toBe(0);
    });

    it('should return 100% when all users completed', async () => {
      mockPrisma.onboardingStatus.count.mockResolvedValueOnce(50);
      mockPrisma.onboardingStatus.count.mockResolvedValueOnce(50);
      mockPrisma.onboardingStatus.aggregate.mockResolvedValue({ _avg: { currentStep: 5 } });

      const result = await service.getCompletionStats();

      expect(result.completionRate).toBe(1);
      expect(result.avgSteps).toBe(5);
    });
  });
});
