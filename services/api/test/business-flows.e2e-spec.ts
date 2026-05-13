import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/redis/redis.module';
import { MessagingService } from '../src/messaging/messaging.service';
import { SafetyService } from '../src/safety/safety.service';
import { PointsService } from '../src/points/points.service';

function makeToken(jwtService: JwtService, user: { id: string; email: string; role: string }): string {
  return jwtService.sign({ sub: user.id, email: user.email, role: user.role });
}

const mockRedisClient = { publish: jest.fn().mockResolvedValue(1), get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue('OK') };
const mockMessagingService = {
  sendMessage: jest.fn().mockResolvedValue(null),
  getConversation: jest.fn().mockResolvedValue([]),
  getInbox: jest.fn().mockResolvedValue([]),
};
const mockSafetyService = {
  analyzeMessage: jest.fn().mockResolvedValue({ isSafe: true, safetyScore: 0, flags: [] }),
  recordSafetyScore: jest.fn().mockResolvedValue(null),
};

const mockPointsService = {
  awardPoints: jest.fn().mockResolvedValue({ id: 'tx-1', transactionType: 'EARN', amount: 100, balanceAfter: 500 }),
  spendPoints: jest.fn().mockResolvedValue({ id: 'tx-2', transactionType: 'SPEND', amount: -200, balanceAfter: 300 }),
  getBalance: jest.fn().mockResolvedValue(1250),
  getLedger: jest.fn().mockResolvedValue({ entries: [], total: 0, page: 1, pageSize: 20 }),
};

const mockUser = {
  id: 'user-child-1', email: 'child@udb.dev', role: 'CHILD', displayName: 'Test Child',
  avatarUrl: null, uupData: {}, accessibilitySettings: {}, createdAt: new Date(),
  doterProfile: { id: 'doter-1', state: 'EGG', name: 'Doter', level: 1, xp: 0, coinBalance: 0, streakDays: 0, isSluggy: false, isEnergetic: false },
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn().mockImplementation(({ where }: any) => {
      if (where.id === 'user-child-1' || where.email === 'child@udb.dev') return Promise.resolve(mockUser);
      if (where.id === 'user-parent-1' || where.email === 'parent@udb.dev') return Promise.resolve({ ...mockUser, id: 'user-parent-1', email: 'parent@udb.dev', role: 'PARENT' });
      if (where.id === 'user-admin-1' || where.email === 'admin@udb.dev') return Promise.resolve({ ...mockUser, id: 'user-admin-1', email: 'admin@udb.dev', role: 'ADMIN' });
      return Promise.resolve(null);
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-user-1', ...data })),
    update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...mockUser, ...data })),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'upsert-user-1', ...create })),
    delete: jest.fn().mockResolvedValue(mockUser),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(42),
  },
  onboardingStatus: {
    count: jest.fn().mockResolvedValue(10),
  },
  quest: {
    findUnique: jest.fn().mockImplementation(({ where }: any) => {
      const questId = where?.id || 'quest-1';
      return Promise.resolve({ id: questId, userId: 'user-child-1', title: 'Test Quest', description: '', status: 'PENDING', pillar: 'ACADEMIC', xpReward: 100, coinReward: 50, goalId: null, dueDate: null, proofUrl: null, proofType: null, aiConfidence: null, aiVerified: false, isChunk: false, parentQuestId: null, chunkIndex: null, metadata: {}, createdAt: new Date(), updatedAt: new Date() });
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-quest-1', ...data, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() })),
    update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'quest-1', userId: 'user-child-1', title: 'Test Quest', status: 'APPROVED', ...data })),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  familyLink: {
    findFirst: jest.fn().mockImplementation(({ where }: any) => {
      if (where?.parentId === 'user-parent-1' && where?.childId === 'user-child-1') return Promise.resolve({ id: 'link-1', parentId: 'user-parent-1', childId: 'user-child-1', consentVerified: true, createdAt: new Date() });
      return Promise.resolve(null);
    }),
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      if (where?.parentId === 'user-parent-1') return Promise.resolve([{ id: 'link-1', parentId: 'user-parent-1', childId: 'user-child-1', consentVerified: true, consentMethod: 'CREDIT_CARD', createdAt: new Date(), child: { ...mockUser, doterProfile: mockUser.doterProfile } }]);
      return Promise.resolve([]);
    }),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-link-1', ...data })),
    upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'upsert-link-1', ...create })),
    delete: jest.fn().mockResolvedValue({ id: 'link-1' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  pointsLedger: {
    findFirst: jest.fn().mockResolvedValue({ id: 'ledger-1', userId: 'user-child-1', transactionType: 'EARN', amount: 100, balanceAfter: 500, source: 'QUEST', description: 'Test', status: 'SETTLED', createdAt: new Date() }),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-ledger-1', ...data })),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  goal: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
  activity: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'act-1' }),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  notification: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
  doterProfile: {
    findUnique: jest.fn().mockResolvedValue(mockUser.doterProfile),
  },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

describe('Business Flow Validation (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService).useValue(mockPrismaService)
      .overrideProvider(REDIS_CLIENT).useValue(mockRedisClient)
      .overrideProvider(MessagingService).useValue(mockMessagingService)
      .overrideProvider(SafetyService).useValue(mockSafetyService)
      .overrideProvider(PointsService).useValue(mockPointsService)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════════════
  // 1. SCHEMA VALIDATION
  // ═══════════════════════════════════════════════════════════════════

  describe('Schema: Business Flow Operations', () => {
    it('should have all new mutations in schema', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ __schema { mutationType { fields { name } } } }' })
        .expect(200);
      const names = res.body.data.__schema.mutationType.fields.map((f: any) => f.name);
      expect(names).toContain('createQuest');
      expect(names).toContain('createMicroQuests');
      expect(names).toContain('submitQuest');
      expect(names).toContain('approveQuest');
      expect(names).toContain('purchaseItem');
      expect(names).toContain('unlinkChild');
      expect(names).toContain('updateUserRole');
      expect(names).toContain('deleteUser');
    });

    it('should have all new queries in schema', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ __schema { queryType { fields { name } } } }' })
        .expect(200);
      const names = res.body.data.__schema.queryType.fields.map((f: any) => f.name);
      expect(names).toContain('myQuests');
      expect(names).toContain('questById');
      expect(names).toContain('childQuests');
    });

    it('should include QuestStatus and QuestPillar enums', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ __schema { types { name } } }' })
        .expect(200);
      const typeNames = res.body.data.__schema.types.map((t: any) => t.name);
      expect(typeNames).toContain('QuestStatus');
      expect(typeNames).toContain('QuestPillar');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. ROLE ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════

  describe('Role Enforcement', () => {
    let childTok: string, parentTok: string, adminTok: string;

    beforeAll(() => {
      childTok = makeToken(jwtService, { id: 'user-child-1', email: 'child@udb.dev', role: 'CHILD' });
      parentTok = makeToken(jwtService, { id: 'user-parent-1', email: 'parent@udb.dev', role: 'PARENT' });
      adminTok = makeToken(jwtService, { id: 'user-admin-1', email: 'admin@udb.dev', role: 'ADMIN' });
    });

    const gql = (query: string, token?: string) => {
      const req = request(app.getHttpServer()).post('/graphql').send({ query });
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req;
    };

    it('CHILD should NOT access PARENT-only operations', async () => {
      const res = await gql(`mutation { linkChild(childId: "x", consentMethod: "CREDIT_CARD") }`, childTok);
      expect(res.body.errors).toBeDefined();
    });

    it('PARENT should NOT access ADMIN-only operations', async () => {
      const res = await gql(`query { analyticsOverview { dau wau mau } }`, parentTok);
      expect(res.body.errors).toBeDefined();
    });

    it('CHILD should NOT access ADMIN-only operations', async () => {
      const res = await gql(`query { onboardingStats { total completed } }`, childTok);
      expect(res.body.errors).toBeDefined();
    });

    it('unauthenticated requests should fail on protected queries', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ me { id email } }' })
        .expect(200);
      expect(res.body.errors).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. CHILD JOURNEY
  // ═══════════════════════════════════════════════════════════════════

  describe('CHILD Journey', () => {
    let childToken: string;
    let createdQuestId: string;

    beforeAll(() => {
      childToken = makeToken(jwtService, { id: 'user-child-1', email: 'child@udb.dev', role: 'CHILD' });
    });

    it('CHILD can create a quest', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: `mutation { createQuest(data: { title: "My First Quest", pillar: ACADEMIC, xpReward: 100, coinReward: 50 }) { id title status pillar } }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.createQuest.title).toBe('My First Quest');
      expect(res.body.data.createQuest.status).toBe('PENDING');
      createdQuestId = res.body.data.createQuest.id;
    });

    it('CHILD can view their quests', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: '{ myQuests { id title status } }' })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.myQuests).toBeDefined();
    });

    it('CHILD can submit a quest with proof', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: `mutation { submitQuest(data: { questId: "${createdQuestId}", proofUrl: "https://example.com", proofType: "URL" }) { id status } }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.submitQuest.status).toBe('SUBMITTED');
    });

    it('CHILD can view their balance', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: '{ myBalance }' })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(typeof res.body.data.myBalance).toBe('number');
    });

    it('CHILD can view marketplace items', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: '{ marketplaceItems { id name cost } }' })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.marketplaceItems.length).toBeGreaterThan(0);
    });

    it('CHILD can view quest by ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: `{ questById(id: "${createdQuestId}") { id title status } }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.questById.id).toBe(createdQuestId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. PARENT JOURNEY
  // ═══════════════════════════════════════════════════════════════════

  describe('PARENT Journey', () => {
    let parentToken: string;

    beforeAll(() => {
      parentToken = makeToken(jwtService, { id: 'user-parent-1', email: 'parent@udb.dev', role: 'PARENT' });
    });

    it('PARENT can view their children', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: '{ myChildren { id email displayName } }' })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.myChildren).toBeDefined();
    });

    it('PARENT can view their family', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: '{ myFamily }' })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.myFamily).toBeDefined();
    });

    it('PARENT can link a new child', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: `mutation { linkChild(childId: "user-child-1", consentMethod: "CREDIT_CARD") }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
    });

    it('PARENT can view child quests', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: `{ childQuests(childId: "user-child-1") { id title status } }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
    });

    it('PARENT can approve child quest', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: `mutation { approveQuest(data: { questId: "quest-1" }) { id status } }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.approveQuest.status).toBe('APPROVED');
    });

    it('PARENT can unlink a child', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: `mutation { unlinkChild(childId: "user-child-1") }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. ADMIN JOURNEY
  // ═══════════════════════════════════════════════════════════════════

  describe('ADMIN Journey', () => {
    let adminToken: string;

    beforeAll(() => {
      adminToken = makeToken(jwtService, { id: 'user-admin-1', email: 'admin@udb.dev', role: 'ADMIN' });
    });

    it('ADMIN can view analytics overview', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: '{ analyticsOverview { totalUsers dau wau mau } }' })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.analyticsOverview.totalUsers).toBeGreaterThanOrEqual(0);
    });

    it('ADMIN can update user role', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: `mutation { updateUserRole(userId: "user-child-1", role: PARENT) { success role } }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.updateUserRole.success).toBe(true);
    });

    it('ADMIN can delete a user', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: `mutation { deleteUser(userId: "user-child-1") }` })
        .expect(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.deleteUser).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. QUEST FULL LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════

  describe('Quest Full Lifecycle', () => {
    let childToken: string;
    let parentToken: string;
    let questId: string;
    let questCreateSpy = mockPrismaService.quest.create;

    beforeAll(() => {
      childToken = makeToken(jwtService, { id: 'user-child-1', email: 'child@udb.dev', role: 'CHILD' });
      parentToken = makeToken(jwtService, { id: 'user-parent-1', email: 'parent@udb.dev', role: 'PARENT' });
      questCreateSpy.mockClear();
    });

    it('1. CHILD creates quest → PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: `mutation { createQuest(data: { title: "Full Lifecycle Quest", pillar: ACADEMIC }) { id status } }` })
        .expect(200);
      expect(res.body.data.createQuest.status).toBe('PENDING');
      questId = res.body.data.createQuest.id;
    });

    it('2. CHILD submits quest → SUBMITTED', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ query: `mutation { submitQuest(data: { questId: "${questId}", proofUrl: "https://example.com", proofType: "URL" }) { id status } }` })
        .expect(200);
      expect(res.body.data.submitQuest.status).toBe('SUBMITTED');
    });

    it('3. PARENT approves quest → APPROVED', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ query: `mutation { approveQuest(data: { questId: "${questId}" }) { id status } }` })
        .expect(200);
      expect(res.body.data.approveQuest.status).toBe('APPROVED');
    });
  });
});
