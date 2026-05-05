import { Test, TestingModule } from '@nestjs/testing';
import { MonteCarloService } from './monte-carlo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MonteCarloService', () => {
  let service: MonteCarloService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonteCarloService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MonteCarloService>(MonteCarloService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should run simulation and return scores', async () => {
    const userId = 'user-1';
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      uupData: { entrepreneurship: { totalRevenue: 500 } },
      doterProfile: { streakDays: 15 },
      skillGaps: [{ id: 'gap-1' }],
    });

    const results = await service.runSimulation(userId, 100);
    
    expect(results.p50.academic).toBeGreaterThan(0);
    expect(results.p50.financial).toBeGreaterThan(0);
    expect(results.p50.wellness).toBeGreaterThan(0);
    expect(results.p50.financial).toBeGreaterThan(results.p50.academic); // Because revenue > 100
  });
});
