import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('AuditService — Immutability & WORM Pattern', () => {
  let service: AuditService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockBlockchain = {
    mintSBT: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: mockBlockchain },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('write — WORM (Write Once Read Many)', () => {
    it('should create an audit log entry', async () => {
      const testData = { actorId: 'user-1', action: 'TEST_ACTION', targetType: 'test', targetId: 'test-1', payload: { key: 'value' } };
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1', ...testData });

      const result = await service.write(testData);

      expect(result).toBeDefined();
      expect(result.id).toBe('log-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({ data: testData });
    });

    it('should anchor high-integrity events (UUP_SYNC) to blockchain', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-uup-1',
        actorId: 'user-1',
        action: 'UUP_SYNC',
        payload: { changes: ['field1'] },
      });
      mockBlockchain.mintSBT.mockResolvedValue('tx-hash-1');

      const result = await service.write({
        actorId: 'user-1',
        action: 'UUP_SYNC',
        payload: { changes: ['field1'] },
      });

      expect(mockBlockchain.mintSBT).toHaveBeenCalledWith('user-1', 'LOG-log-uup-1', '{"changes":["field1"]}');
      expect(result).toBeDefined();
    });

    it('should anchor high-integrity events (FUND_RELEASE) to blockchain', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-fund-1',
        actorId: 'user-1',
        action: 'FUND_RELEASE',
        payload: { amount: 100 },
      });
      mockBlockchain.mintSBT.mockResolvedValue('tx-hash-2');

      const result = await service.write({
        actorId: 'user-1',
        action: 'FUND_RELEASE',
        payload: { amount: 100 },
      });

      expect(mockBlockchain.mintSBT).toHaveBeenCalledWith('user-1', 'LOG-log-fund-1', '{"amount":100}');
      expect(result).toBeDefined();
    });

    it('should not anchor low-integrity events to blockchain', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-normal-1',
        actorId: 'user-1',
        action: 'PROFILE_UPDATE',
        payload: { field: 'displayName' },
      });

      const result = await service.write({
        actorId: 'user-1',
        action: 'PROFILE_UPDATE',
        payload: { field: 'displayName' },
      });

      expect(mockBlockchain.mintSBT).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should not fail if blockchain anchor fails (non-blocking)', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-fail-1',
        actorId: 'user-1',
        action: 'UUP_SYNC',
      });
      mockBlockchain.mintSBT.mockRejectedValue(new Error('Blockchain unavailable'));

      const result = await service.write({
        actorId: 'user-1',
        action: 'UUP_SYNC',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('log-fail-1');
    });
  });

  describe('immutability — NO update/delete operations exposed', () => {
    it('should NOT expose an update method', () => {
      expect((service as any).updateAuditLog).toBeUndefined();
    });

    it('should NOT expose a delete method', () => {
      expect((service as any).deleteAuditLog).toBeUndefined();
    });

    it('should NOT expose a purge method', () => {
      expect((service as any).purgeAuditLog).toBeUndefined();
    });
  });

  describe('getLogs — read-only query', () => {
    it('should return logs for a given actor', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1', actorId: 'user-1', action: 'ACTION_1', createdAt: new Date() },
        { id: 'log-2', actorId: 'user-1', action: 'ACTION_2', createdAt: new Date() },
      ]);

      const result = await service.getLogs('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getLogs('user-1', 10);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});
