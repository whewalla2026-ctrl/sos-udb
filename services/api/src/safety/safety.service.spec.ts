import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService } from './safety.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { SafetyScoreResult } from './safety.service';

describe('SafetyService — COPPA & Safety Score', () => {
  let service: SafetyService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  const mockUupSync = {};

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UUPSyncService, useValue: mockUupSync },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('safety score calculation', () => {
    it('should return a score with breakdown when all data available', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: 0.8 }])
        .mockResolvedValueOnce([{ completed: 10, total: 12 }])
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ hour: 22 + i })))
        .mockResolvedValueOnce([{ count: 30 }])
        .mockResolvedValueOnce([{ minutes: 120 }])
        .mockResolvedValueOnce([{ avg_stress: 0.3, avg_hrv: 65 }])
        .mockResolvedValueOnce([]);

      const result = (await service.getLatestSafetyScore('user-1')) as SafetyScoreResult;

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toHaveProperty('focusConsistency');
      expect(result.breakdown).toHaveProperty('routineCompletion');
      expect(result.breakdown).toHaveProperty('sleepRegularity');
      expect(result.breakdown).toHaveProperty('socialEngagement');
      expect(result.breakdown).toHaveProperty('biometricStability');
      expect(result.trend).toMatch(/^(improving|stable|declining)$/);
      expect(result.lastCalculated).toBeDefined();
    });

    it('should use default value 0.5 when no focus data exists', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: null }])
        .mockResolvedValueOnce([{ completed: 0, total: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ minutes: 0 }])
        .mockResolvedValueOnce([{ avg_stress: null, avg_hrv: null }])
        .mockResolvedValueOnce([]);

      const result = (await service.getLatestSafetyScore('user-1')) as SafetyScoreResult;

      expect(result.score).toBe(0);
    });

    it('should emit safety:alert when score < 40', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: 0.1 }])
        .mockResolvedValueOnce([{ completed: 0, total: 10 }])
        .mockResolvedValueOnce(Array.from({ length: 10 }, () => ({ hour: 2 })))
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ minutes: 0 }])
        .mockResolvedValueOnce([{ avg_stress: 0.9, avg_hrv: 30 }])
        .mockResolvedValueOnce([]);

      await service.getLatestSafetyScore('user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('safety:alert', {
        userId: 'user-1',
        score: expect.any(Number),
        type: expect.stringMatching(/^(warning|critical)$/),
      });
    });

    it('should emit critical alert when score < 25', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: 0.05 }])
        .mockResolvedValueOnce([{ completed: 0, total: 10 }])
        .mockResolvedValueOnce(Array.from({ length: 10 }, () => ({ hour: 2 })))
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ minutes: 0 }])
        .mockResolvedValueOnce([{ avg_stress: 0.95, avg_hrv: 20 }])
        .mockResolvedValueOnce([]);

      const result = (await service.getLatestSafetyScore('user-1')) as SafetyScoreResult;

      expect(result.score).toBeLessThan(25);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('safety:alert', {
        userId: 'user-1',
        score: expect.any(Number),
        type: 'critical',
      });
    });
  });

  describe('COPPA VPC: safety score as wellbeing proxy', () => {
    it('should detect declining trend over 7+ days', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: 0.8 }])
        .mockResolvedValueOnce([{ completed: 10, total: 12 }])
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ hour: 22 + i })))
        .mockResolvedValueOnce([{ count: 30 }])
        .mockResolvedValueOnce([{ minutes: 120 }])
        .mockResolvedValueOnce([{ avg_stress: 0.3, avg_hrv: 65 }])
        .mockResolvedValueOnce([
          { avg_score: 35 }, { avg_score: 40 }, { avg_score: 45 },
          { avg_score: 50 }, { avg_score: 55 }, { avg_score: 60 },
        ]);

      const result = (await service.getLatestSafetyScore('user-1')) as SafetyScoreResult;

      expect(result.trend).toBe('declining');
    });

    it('should detect improving trend over 7+ days', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: 0.8 }])
        .mockResolvedValueOnce([{ completed: 10, total: 12 }])
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ hour: 22 + i })))
        .mockResolvedValueOnce([{ count: 30 }])
        .mockResolvedValueOnce([{ minutes: 120 }])
        .mockResolvedValueOnce([{ avg_stress: 0.3, avg_hrv: 65 }])
        .mockResolvedValueOnce([
          { avg_score: 60 }, { avg_score: 55 }, { avg_score: 50 },
          { avg_score: 45 }, { avg_score: 40 }, { avg_score: 35 },
        ]);

      const result = (await service.getLatestSafetyScore('user-1')) as SafetyScoreResult;

      expect(result.trend).toBe('improving');
    });

    it('should return stable when trend is within 5% bounds', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ avg_focus: 0.8 }])
        .mockResolvedValueOnce([{ completed: 10, total: 12 }])
        .mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ hour: 22 + i })))
        .mockResolvedValueOnce([{ count: 30 }])
        .mockResolvedValueOnce([{ minutes: 120 }])
        .mockResolvedValueOnce([{ avg_stress: 0.3, avg_hrv: 65 }])
        .mockResolvedValueOnce([
          { avg_score: 50 }, { avg_score: 51 }, { avg_score: 50 },
          { avg_score: 52 }, { avg_score: 51 }, { avg_score: 53 },
        ]);

      const result = (await service.getLatestSafetyScore('user-1')) as SafetyScoreResult;

      expect(result.trend).toBe('stable');
    });
  });
});
