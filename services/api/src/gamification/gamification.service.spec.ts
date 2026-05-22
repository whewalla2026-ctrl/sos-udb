import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockUUP = (overrides: any = {}) => ({
  biometric: { avg_sleep_hours: 7, stress_index: 0.3, hrv_baseline: 65, chronotype: 'neutral', last_sync: null, ...overrides.biometric },
  academic: { math_rit: 0, reading_rit: 0, lms_sync_status: 'pending', skill_gaps: {}, workload_forecast: 0, ...overrides.academic },
  gamification: { doter_state: 'NEUTRAL', doter_level: 1, xp: 0, coin_balance: 0, active_streaks: 0, streak_freeze_available: 0, last_streak_freeze_auto: null, ...overrides.gamification },
  entrepreneurship: { active_projects: [], total_revenue_usd: 0, wallet_balance: 0, ...overrides.entrepreneurship },
  metadata: { blockchain_wallet: null, coppa_consent: false, last_updated: new Date().toISOString(), ...overrides.metadata },
});

describe('GamificationService', () => {
  let service: GamificationService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const mockUupSync = {
    getUUP: jest.fn(),
    sync: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UUPSyncService, useValue: mockUupSync },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processBiometricUpdate', () => {
    it('should transition NEUTRAL to ENERGETIC when sleep >= 8h, stress < 0.3, streak > 0', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({
        biometric: { avg_sleep_hours: 8.5, stress_index: 0.2 },
        gamification: { doter_state: 'NEUTRAL', active_streaks: 1 },
      }));
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.processBiometricUpdate('user-1', { sleepHours: 8.5, stressIndex: 0.2 });

      expect(result).toBe('ENERGETIC');
      expect(mockUupSync.sync).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('doter:state:changed', expect.any(Object));
    });

    it('should transition NEUTRAL to SLUGGISH when sleep < 6h', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({
        biometric: { avg_sleep_hours: 5 },
        gamification: { doter_state: 'NEUTRAL' },
      }));
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.processBiometricUpdate('user-1', { sleepHours: 5 });

      expect(result).toBe('SLUGGISH');
    });

    it('should transition NEUTRAL to SLUGGISH when stress > 0.7', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({
        biometric: { stress_index: 0.8 },
        gamification: { doter_state: 'NEUTRAL' },
      }));
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.processBiometricUpdate('user-1', { stressIndex: 0.8 });

      expect(result).toBe('SLUGGISH');
    });

    it('should stay RESTING when already RESTING', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({
        biometric: { avg_sleep_hours: 5 },
        gamification: { doter_state: 'RESTING' },
      }));
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.processBiometricUpdate('user-1', { sleepHours: 5 });

      expect(result).toBe('RESTING');
      expect(mockUupSync.sync).not.toHaveBeenCalled();
    });

    it('should NOT transition ENERGETIC to EVOLVING without parent approval', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({
        biometric: { avg_sleep_hours: 7, stress_index: 0.5 },
        gamification: { doter_state: 'ENERGETIC' },
      }));

      const result = await service.processBiometricUpdate('user-1', { sleepHours: 7, stressIndex: 0.5 });

      expect(result).not.toBe('EVOLVING');
      expect(result).toBe('NEUTRAL');
    });
  });

  describe('awardPoints', () => {
    it('should create transaction with unique hash', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ gamification: { coin_balance: 0, xp: 0 } }));
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.awardPoints('user-1', 100, 'QUEST_REWARD', 'ref-1');

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(result.amount).toBe(100);
      expect(result.type).toBe('QUEST_REWARD');
      expect(result.hash).toBeDefined();
    });

    it('should return existing transaction on duplicate hash', async () => {
      const existingTx = { id: 'tx-1', userId: 'user-1', amount: 100, type: 'QUEST_REWARD', status: 'COMPLETED', hash: 'dup-hash' };
      mockPrisma.$queryRaw.mockResolvedValue([existingTx]);

      const result = await service.awardPoints('user-1', 100, 'QUEST_REWARD', 'ref-1');

      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
      expect(result).toEqual(existingTx);
    });
  });

  describe('spendPoints', () => {
    it('should reject if insufficient balance', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ gamification: { coin_balance: 50 } }));

      await expect(service.spendPoints('user-1', 100, 'SPENT', 'ref-1')).rejects.toThrow('Insufficient points');
    });

    it('should create negative transaction on spend', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ gamification: { coin_balance: 100 } }));
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      const result = await service.spendPoints('user-1', 50, 'SPENT', 'ref-1');

      expect(result.amount).toBe(-50);
    });
  });

  describe('activateStreakFreeze', () => {
    it('manual should decrement available count', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ gamification: { streak_freeze_available: 2 } }));
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.activateStreakFreeze('user-1', 'manual');

      expect(result).toBe(true);
      expect(mockUupSync.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gamification: expect.objectContaining({ streak_freeze_available: 1 }) },
        }),
      );
    });
  });
});
