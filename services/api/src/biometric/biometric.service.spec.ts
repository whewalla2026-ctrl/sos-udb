import { Test, TestingModule } from '@nestjs/testing';
import { BiometricService } from './biometric.service';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
import { FeatureFlagService } from '../feature-flags/feature-flag.service';

describe('BiometricService — BR-06 Streak Freeze Auto-Grant', () => {
  let service: BiometricService;

  const mockPrisma = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    pointsLedger: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const mockUupSync = {
    sync: jest.fn(),
    getUUP: jest.fn(),
  };

  const mockEventEmitter = {
    on: jest.fn(),
    emit: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
  };

  const mockFeatureFlags = {
    isEnabled: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UUPSyncService, useValue: mockUupSync },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: RedisService, useValue: mockRedis },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
      ],
    }).compile();

    service = module.get<BiometricService>(BiometricService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('BR-06: Streak freeze auto-grant when biometric stress detected', () => {
    it('should skip granting if already granted in last 30 days (redis key exists)', async () => {
      mockRedis.get.mockResolvedValue('1');

      await service['checkStreakFreezeConditions']('user-1');

      expect(mockPrisma.pointsLedger.create).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should grant streak freeze when all stress conditions are met', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ hrv: 100, resting_hr: 65 }])
        .mockResolvedValueOnce([{ hrv: 70, resting_hr: 78, low_sleep_days: 3 }]);
      mockUupSync.getUUP.mockResolvedValue({
        gamification: { doter_state: 'ACTIVE' },
      });
      mockPrisma.pointsLedger.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service['checkStreakFreezeConditions']('user-1');

      expect(mockRedis.setex).toHaveBeenCalledWith('streak_freeze_auto:user-1', expect.any(Number), '1');
      expect(mockPrisma.pointsLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          transactionType: 'EARN',
          amount: 1,
          source: 'STREAK_REWARD',
          description: 'STREAK_FREEZE_AUTO_GRANT',
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'STREAK_FREEZE_AUTO_GRANT',
        }),
      });
      expect(mockUupSync.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gamification: { doter_state: 'RESTING' } },
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification:create', expect.objectContaining({
        userId: 'user-1',
        type: 'STREAK_FREEZE',
      }));
    });

    it('should not grant streak freeze if no hrv drop', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ hrv: 80, resting_hr: 65 }])
        .mockResolvedValueOnce([{ hrv: 75, resting_hr: 78, low_sleep_days: 3 }]);

      await service['checkStreakFreezeConditions']('user-1');

      expect(mockPrisma.pointsLedger.create).not.toHaveBeenCalled();
    });

    it('should not grant streak freeze if not enough low-sleep days', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ hrv: 100, resting_hr: 65 }])
        .mockResolvedValueOnce([{ hrv: 70, resting_hr: 78, low_sleep_days: 1 }]);

      await service['checkStreakFreezeConditions']('user-1');

      expect(mockPrisma.pointsLedger.create).not.toHaveBeenCalled();
    });

    it('should not grant streak freeze if no elevated heart rate', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ hrv: 100, resting_hr: 65 }])
        .mockResolvedValueOnce([{ hrv: 70, resting_hr: 68, low_sleep_days: 3 }]);

      await service['checkStreakFreezeConditions']('user-1');

      expect(mockPrisma.pointsLedger.create).not.toHaveBeenCalled();
    });
  });

  describe('Doter transition', () => {
    it('should transition to SLUGGISH when sleep < 6h', async () => {
      mockUupSync.getUUP.mockResolvedValue({
        biometric: { avg_sleep_hours: 5 },
        gamification: { doter_state: 'NEUTRAL' },
      });

      await service['triggerDoterTransition']('user-1');

      expect(mockUupSync.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gamification: { doter_state: 'SLUGGISH' } },
        }),
      );
    });

    it('should transition to SLUGGISH when stress > 0.7', async () => {
      mockUupSync.getUUP.mockResolvedValue({
        biometric: { avg_sleep_hours: 8, stress_index: 0.8 },
        gamification: { doter_state: 'NEUTRAL' },
      });

      await service['triggerDoterTransition']('user-1');

      expect(mockUupSync.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gamification: { doter_state: 'SLUGGISH' } },
        }),
      );
    });

    it('should transition to ENERGETIC when sleep >= 8h and stress < 0.3', async () => {
      mockUupSync.getUUP.mockResolvedValue({
        biometric: { avg_sleep_hours: 9, stress_index: 0.2 },
        gamification: { doter_state: 'NEUTRAL' },
      });

      await service['triggerDoterTransition']('user-1');

      expect(mockUupSync.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gamification: { doter_state: 'ENERGETIC' } },
        }),
      );
    });

    it('should not transition if state is already same', async () => {
      mockUupSync.getUUP.mockResolvedValue({
        biometric: { avg_sleep_hours: 5 },
        gamification: { doter_state: 'SLUGGISH' },
      });

      await service['triggerDoterTransition']('user-1');

      expect(mockUupSync.sync).not.toHaveBeenCalled();
    });
  });
});
