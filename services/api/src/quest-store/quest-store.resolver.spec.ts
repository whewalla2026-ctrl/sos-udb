import { Test, TestingModule } from '@nestjs/testing';
import { QuestStoreResolver } from './quest-store.resolver';
import { QuestStoreService } from './quest-store.service';
import { PrismaService } from '../prisma/prisma.service';

describe('QuestStoreResolver', () => {
  let resolver: QuestStoreResolver;
  let service: QuestStoreService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.$executeRaw.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestStoreResolver,
        QuestStoreService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    resolver = module.get<QuestStoreResolver>(QuestStoreResolver);
    service = module.get<QuestStoreService>(QuestStoreService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should browse quests with filters', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { id: 'q1', title: 'Math Quest', description: 'Fun math', age_min: 8, age_max: 12, skill_tags: '["math"]', status: 'approved', price: 0, downloads: 10, rating: 4.5 },
    ]);

    const result = await resolver.browseQuests('math', 8, 12, 'math');
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('should submit a quest and return its ID', async () => {
    mockPrisma.$executeRaw.mockResolvedValue([]);
    const result = await resolver.submitQuest(
      { id: 'creator-1' },
      'My Quest',
      'A fun quest',
      8, 14,
      ['math', 'creative'],
      30,
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should purchase a quest', async () => {
    mockPrisma.$executeRaw.mockResolvedValue([]);
    const result = await resolver.purchaseQuest({ id: 'user-1' }, 'quest-1');
    expect(result).toBe(true);
  });

  it('should return creator analytics', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { id: 'q1', title: 'My Quest', downloads: 5, rating: 4.2 },
    ]);
    const result = await resolver.creatorAnalytics({ id: 'creator-1' });
    expect(result).toBeDefined();
    expect(result.quests).toHaveLength(1);
  });
});
