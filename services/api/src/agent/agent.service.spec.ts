import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AgentService', () => {
  let service: AgentService;

  const mockPrisma = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('receiveHeartbeat', () => {
    it('should insert heartbeat with calculated focus score', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      await service.receiveHeartbeat({
        userId: 'user-1',
        timestamp: new Date().toISOString(),
        appUsage: [
          { appName: 'Khan Academy', category: 'educational', durationSec: 600 },
          { appName: 'YouTube', category: 'entertainment', durationSec: 300 },
        ],
        focusScore: 0.8,
        agentVersion: '1.0.0',
        platform: 'macOS',
      }, 'user-1');

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('receiveHeartbeatFallback', () => {
    it('should insert fallback heartbeat with given score', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      await service.receiveHeartbeatFallback('user-1', 0.7);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should default to 0.5 when score is falsy', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      await service.receiveHeartbeatFallback('user-1', 0);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateFocusScore', () => {
    it('should return ratio of productive time to total time', () => {
      const score = (service as any).calculateFocusScore([
        { appName: 'Khan Academy', category: 'educational', durationSec: 600 },
        { appName: 'YouTube', category: 'entertainment', durationSec: 200 },
      ]);
      expect(score).toBeCloseTo(0.75);
    });

    it('should return 0.5 when total time is 0', () => {
      const score = (service as any).calculateFocusScore([]);
      expect(score).toBe(0.5);
    });

    it('should cap score at 1', () => {
      const score = (service as any).calculateFocusScore([
        { appName: 'Duolingo', category: 'educational', durationSec: 100 },
      ]);
      expect(score).toBe(1);
    });
  });

  describe('getFocusHistory', () => {
    it('should query agent_heartbeats with date filter', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getFocusHistory('user-1', 7);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('registerAgent', () => {
    it('should upsert registered agent', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      await service.registerAgent('user-1', 'macOS', '1.0.0');

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
