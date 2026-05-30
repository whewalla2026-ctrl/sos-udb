import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagService } from './feature-flag.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  const mockRedis = {
    hgetall: jest.fn(),
    hset: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.hgetall.mockResolvedValue({});
    mockRedis.hset.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with 13 default flags from Redis', async () => {
    const all = await service.getAllFlags();
    expect(all.length).toBe(13);
  });

  it('should return true for enabled flags', async () => {
    expect(await service.isEnabled('safety-score')).toBe(true);
    expect(await service.isEnabled('data-export')).toBe(true);
    expect(await service.isEnabled('messaging')).toBe(true);
  });

  it('should return false for disabled flags', async () => {
    expect(await service.isEnabled('offline-tutor')).toBe(false);
    expect(await service.isEnabled('desktop-agent')).toBe(false);
    expect(await service.isEnabled('co-op-quests')).toBe(false);
  });

  it('should return false for unknown flags', async () => {
    expect(await service.isEnabled('nonexistent-flag')).toBe(false);
  });

  it('should persist flag changes to Redis', async () => {
    await service.setFlag('offline-tutor', true);
    expect(mockRedis.hset).toHaveBeenCalledWith(
      'feature-flags',
      'offline-tutor',
      expect.any(String),
    );
    expect(await service.isEnabled('offline-tutor')).toBe(true);
  });

  it('should return a specific flag by name', async () => {
    const flag = await service.getFlag('safety-score');
    expect(flag).toBeDefined();
    expect(flag!.name).toBe('safety-score');
    expect(flag!.enabled).toBe(true);
  });

  it('should handle rollout percentage with userId', async () => {
    const flag = await service.getFlag('safety-score');
    flag!.rolloutPercentage = 50;
    const result = await service.isEnabled('safety-score', 'user-1');
    expect(typeof result).toBe('boolean');
  });
});
