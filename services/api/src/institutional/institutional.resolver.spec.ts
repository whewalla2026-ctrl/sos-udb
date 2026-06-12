import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionalResolver } from './institutional.resolver';
import { InstitutionalService } from './institutional.service';
import { MockIntegrationService } from '../shared/mock-integration.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

describe('InstitutionalResolver', () => {
  let resolver: InstitutionalResolver;
  let service: InstitutionalService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.$executeRaw.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionalResolver,
        InstitutionalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MockIntegrationService, useFactory: () => new MockIntegrationService(new ConfigService()) },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    resolver = module.get<InstitutionalResolver>(InstitutionalResolver);
    service = module.get<InstitutionalService>(InstitutionalService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return null for teacherDashboard when user is not TEACHER/ADMIN', async () => {
    const result = await resolver.teacherDashboard({ id: 'u1', role: 'CHILD' });
    expect(result).toBeNull();
  });

  it('should return dashboard for TEACHER role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 't1', schoolId: 's1' });
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ signed_at: new Date(), expires_at: new Date(Date.now() + 86400000) }])
      .mockResolvedValueOnce([{ rate: 0.75 }]);

    const result = await resolver.teacherDashboard({ id: 't1', role: 'TEACHER' });
    expect(result).toBeDefined();
    expect(result!.schoolId).toBe('s1');
    expect(result!.cohortMetrics.questCompletionRate).toBe(0.75);
  });

  it('should return false for assignQuestToClass when user is not TEACHER/ADMIN', async () => {
    const result = await resolver.assignQuestToClass({ id: 'u1', role: 'CHILD' }, 'q1', 'c1');
    expect(result).toBe(false);
  });
});
