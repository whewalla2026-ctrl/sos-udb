import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from './points.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PointsService', () => {
  let service: PointsService;

  const mockPrisma = {
    pointsLedger: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardPoints', () => {
    it('should award points and update balance', async () => {
      mockPrisma.pointsLedger.findFirst.mockResolvedValue({ balanceAfter: 100 });
      mockPrisma.pointsLedger.create.mockResolvedValue({
        id: 'entry-1',
        userId: 'user-1',
        transactionType: 'EARN',
        amount: 50,
        balanceAfter: 150,
        source: 'QUEST',
        description: 'Completed quest',
      });

      const result = await service.awardPoints('user-1', {
        amount: 50,
        source: 'QUEST' as any,
        description: 'Completed quest',
      });

      expect(result.balanceAfter).toBe(150);
      expect(mockPrisma.pointsLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: 'EARN',
            amount: 50,
            balanceAfter: 150,
          }),
        }),
      );
    });

    it('should start from 0 if no prior ledger entries', async () => {
      mockPrisma.pointsLedger.findFirst.mockResolvedValue(null);
      mockPrisma.pointsLedger.create.mockResolvedValue({
        id: 'entry-1',
        balanceAfter: 100,
      });

      const result = await service.awardPoints('user-1', {
        amount: 100,
        source: 'BONUS' as any,
      });

      expect(result.balanceAfter).toBe(100);
    });
  });

  describe('spendPoints', () => {
    it('should spend points and deduct balance', async () => {
      mockPrisma.pointsLedger.findFirst.mockResolvedValue({ balanceAfter: 200 });
      mockPrisma.pointsLedger.create.mockResolvedValue({
        id: 'entry-2',
        userId: 'user-1',
        transactionType: 'SPEND',
        amount: -50,
        balanceAfter: 150,
      });

      const result = await service.spendPoints('user-1', {
        amount: 50,
        source: 'PURCHASE' as any,
        description: 'Store purchase',
      });

      expect(result.balanceAfter).toBe(150);
      expect(result.amount).toBe(-50);
    });

    it('should throw on insufficient balance', async () => {
      mockPrisma.pointsLedger.findFirst.mockResolvedValue({ balanceAfter: 10 });

      await expect(
        service.spendPoints('user-1', {
          amount: 50,
          source: 'PURCHASE' as any,
        }),
      ).rejects.toThrow('Insufficient points balance');
    });
  });

  describe('getBalance', () => {
    it('should return current balance', async () => {
      mockPrisma.pointsLedger.findFirst.mockResolvedValue({ balanceAfter: 500 });
      const balance = await service.getBalance('user-1');
      expect(balance).toBe(500);
    });

    it('should return 0 for new user', async () => {
      mockPrisma.pointsLedger.findFirst.mockResolvedValue(null);
      const balance = await service.getBalance('user-1');
      expect(balance).toBe(0);
    });
  });

  describe('getLedger', () => {
    it('should return paginated ledger entries', async () => {
      mockPrisma.pointsLedger.findMany.mockResolvedValue([{ id: 'e1', amount: 100 }]);
      mockPrisma.pointsLedger.count.mockResolvedValue(1);

      const result = await service.getLedger('user-1', 1, 20);

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });
});
