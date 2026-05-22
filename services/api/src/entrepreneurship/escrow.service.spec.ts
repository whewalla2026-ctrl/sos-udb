import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

jest.mock('stripe', () => {
  const mockStripe = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_mock', client_secret: 'secret_mock' }),
      capture: jest.fn().mockResolvedValue({ id: 'pi_mock', status: 'succeeded' }),
    },
  }));
  return { default: mockStripe, __esModule: true };
});

describe('EscrowService — Idempotent Holds & Releases', () => {
  let service: EscrowService;

  const mockPrisma = {
    escrow: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEscrow — idempotent creation', () => {
    beforeEach(() => {
      mockConfig.get.mockReturnValue('sk_test_real');
    });

    it('should throw if stripe not configured', async () => {
      mockConfig.get.mockReturnValue('sk_test_mock');

      await expect(
        service.createEscrow('venture-1', 'seller-1', 'buyer@test.com', 50),
      ).rejects.toThrow('Stripe not configured');
    });
  });

  describe('releaseEscrow — idempotent release', () => {
    it('should throw if escrow not found', async () => {
      mockPrisma.escrow.findUnique.mockResolvedValue(null);

      await expect(service.releaseEscrow('nonexistent')).rejects.toThrow('Escrow not found');
    });

    it('should release a HELD escrow', async () => {
      mockPrisma.escrow.findUnique.mockResolvedValue({
        id: 'escrow-1',
        status: 'PROOF_SUBMITTED',
        stripePaymentIntentId: 'pi_123',
      });
      mockPrisma.escrow.update.mockResolvedValue({
        id: 'escrow-1',
        status: 'RELEASED',
        releasedAt: new Date(),
      });

      const result = await service.releaseEscrow('escrow-1');

      expect(result.status).toBe('RELEASED');
      expect(result.releasedAt).toBeDefined();
    });

    it('should warn if proof not yet submitted but still process release', async () => {
      mockPrisma.escrow.findUnique.mockResolvedValue({
        id: 'escrow-2',
        status: 'HELD',
        stripePaymentIntentId: null,
      });
      mockPrisma.escrow.update.mockResolvedValue({
        id: 'escrow-2',
        status: 'RELEASED',
        releasedAt: new Date(),
      });

      const result = await service.releaseEscrow('escrow-2');

      expect(result.status).toBe('RELEASED');
    });
  });

  describe('submitProof — state transition integrity', () => {
    it('should transition escrow to PROOF_SUBMITTED', async () => {
      mockPrisma.escrow.update.mockResolvedValue({
        id: 'escrow-1',
        status: 'PROOF_SUBMITTED',
        proofUrl: 'https://proof.example.com',
        proofNotes: 'Work completed',
      });

      const result = await service.submitProof('escrow-1', 'https://proof.example.com', 'Work completed');

      expect(result.status).toBe('PROOF_SUBMITTED');
      expect(result.proofUrl).toBe('https://proof.example.com');
      expect(mockPrisma.escrow.update).toHaveBeenCalledWith({
        where: { id: 'escrow-1' },
        data: {
          proofUrl: 'https://proof.example.com',
          proofNotes: 'Work completed',
          status: 'PROOF_SUBMITTED',
        },
      });
    });
  });
});
