import { Test, TestingModule } from '@nestjs/testing';
import { UUPSyncService } from './uup-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';

const createMockUUP = (overrides: any = {}) => ({
  biometric: { avg_sleep_hours: 7, stress_index: 0.3, hrv_baseline: 65, chronotype: 'neutral', last_sync: null, ...overrides.biometric },
  academic: { math_rit: 0, reading_rit: 0, lms_sync_status: 'pending', skill_gaps: {}, workload_forecast: 0, ...overrides.academic },
  gamification: { doter_state: 'NEUTRAL', doter_level: 1, xp: 0, coin_balance: 0, active_streaks: 0, streak_freeze_available: 0, ...overrides.gamification },
  entrepreneurship: { active_projects: [], total_revenue_usd: 0, wallet_balance: 0, ...overrides.entrepreneurship },
  metadata: { blockchain_wallet: null, coppa_consent: false, last_updated: new Date().toISOString(), ...overrides.metadata },
});

describe('UUPSyncService', () => {
  let service: UUPSyncService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  };

  const mockRedisClient = { get: jest.fn(), set: jest.fn() };
  const mockRedis = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
    publish: jest.fn(),
    get: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UUPSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<UUPSyncService>(UUPSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sync', () => {
    it('should deep merge UUP data successfully', async () => {
      const user = { id: 'user-1', email: 'test@test.com', role: 'CHILD', uupData: createMockUUP(), updatedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrisma.user.update.mockResolvedValue(user);

      const result = await service.sync({
        source: 'biometric',
        userId: 'user-1',
        data: { biometric: { avg_sleep_hours: 8 } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('should throw on unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.sync({
        source: 'biometric',
        userId: 'nonexistent',
        data: { biometric: { avg_sleep_hours: 8 } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      })).rejects.toThrow('User nonexistent not found');
    });

    it('should throw ConflictException on concurrent modification', async () => {
      const user = { id: 'user-1', email: 'test@test.com', role: 'CHILD', uupData: createMockUUP(), updatedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(Date.now().toString());

      await expect(service.sync({
        source: 'biometric',
        userId: 'user-1',
        data: { biometric: { avg_sleep_hours: 8 } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      })).rejects.toThrow(ConflictException);
    });

    it('should fire doter:state:sluggish when sleep < 6h', async () => {
      const uup = createMockUUP({ biometric: { avg_sleep_hours: 5 } });
      const user = { id: 'user-1', email: 'test@test.com', role: 'CHILD', uupData: uup, updatedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrisma.user.update.mockResolvedValue(user);

      await service.sync({
        source: 'biometric',
        userId: 'user-1',
        data: { biometric: { avg_sleep_hours: 5 } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('doter:state:sluggish', expect.any(Object));
    });

    it('should fire safety:stress:alert when stress > 0.7', async () => {
      const uup = createMockUUP({ biometric: { stress_index: 0.8 } });
      const user = { id: 'user-1', email: 'test@test.com', role: 'CHILD', uupData: uup, updatedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrisma.user.update.mockResolvedValue(user);

      await service.sync({
        source: 'biometric',
        userId: 'user-1',
        data: { biometric: { stress_index: 0.8 } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('safety:stress:alert', expect.any(Object));
    });

    it('should fire doter:evolve when xp crosses level threshold', async () => {
      const uup = createMockUUP({ gamification: { xp: 2500, doter_level: 2 } });
      const user = { id: 'user-1', email: 'test@test.com', role: 'CHILD', uupData: uup, updatedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrisma.user.update.mockResolvedValue(user);

      await service.sync({
        source: 'gamification',
        userId: 'user-1',
        data: { gamification: { xp: 2500, doter_level: 2 } } as any,
        actorId: 'system',
        actorRole: 'ADMIN',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('doter:evolve', expect.any(Object));
    });
  });

  describe('getUUP', () => {
    it('should return user UUP data', async () => {
      const uupData = createMockUUP();
      const user = { id: 'user-1', email: 'test@test.com', role: 'CHILD', uupData, updatedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUUP('user-1');

      expect(result).toEqual(uupData);
    });

    it('should throw on unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUUP('nonexistent')).rejects.toThrow('User nonexistent not found');
    });
  });
});
