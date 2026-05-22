import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queue.module';

describe('BlockchainService — SBT Minting', () => {
  let service: BlockchainService;

  const mockPrisma = {};

  const mockSbtQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(QUEUES.SBT_MINT), useValue: mockSbtQueue },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueMint', () => {
    it('should queue an SBT mint job in BullMQ', async () => {
      const request = {
        userId: 'user-1',
        goalId: 'goal-1',
        skillTag: 'math_grade_5',
        metadataUri: 'https://udb.io/sbt/user-1/goal-1',
      };
      mockSbtQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.queueMint(request);

      expect(result.status).toBe('QUEUED');
      expect(result.userId).toBe('user-1');
      expect(result.skillTag).toBe('math_grade_5');
      expect(mockSbtQueue.add).toHaveBeenCalledWith('mint-sbt', request, expect.objectContaining({
        jobId: expect.stringContaining('user-1-goal-1'),
      }));
    });

    it('should generate unique job IDs for each request', async () => {
      mockSbtQueue.add.mockResolvedValue({ id: 'job-1' });

      const result1 = await service.queueMint({ userId: 'u1', goalId: 'g1', skillTag: 'tag1', metadataUri: 'uri1' });
      const result2 = await service.queueMint({ userId: 'u1', goalId: 'g2', skillTag: 'tag2', metadataUri: 'uri2' });

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('processMint', () => {
    it('should return MINTED status with tx hash', async () => {
      const request = { userId: 'user-1', goalId: 'goal-1', skillTag: 'math', metadataUri: 'uri' };

      const result = await service.processMint(request);

      expect(result.status).toBe('MINTED');
      expect(result.txHash).toMatch(/^0x[a-f0-9]+$/);
      expect(result.userId).toBe('user-1');
    });
  });

  describe('mintSBT — audit anchoring', () => {
    it('should return a token ID on mint', async () => {
      const result = await service.mintSBT('user-1', 'LOG-123', '{"action":"TEST"}');

      expect(result).toHaveProperty('tokenId');
      expect(result.tokenId).toMatch(/^0x/);
      expect(result.userId).toBe('user-1');
      expect(result.id).toBe('LOG-123');
    });
  });
});
