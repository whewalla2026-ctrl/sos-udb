import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AppModule } from '../src/app.module';
import { GqlAuthGuard } from '../src/auth/guards/gql-auth.guard';
import { E2E_MOCK_PROVIDERS } from './e2e-mock-providers';

function makeToken(jwtService: JwtService, user: { id: string; email: string; role: string }): string {
  return jwtService.sign({ sub: user.id, email: user.email, role: user.role });
}

function decodeToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

describe('Business Flow Validation (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const gqlCtx = GqlExecutionContext.create(ctx);
          const req = gqlCtx.getContext().req;
          const authHeader = req.headers?.authorization;
          if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const user = decodeToken(token);
            req.user = user ? { id: user.sub, email: user.email, role: user.role } : undefined;
          }
          return true;
        },
      });

    for (const provider of E2E_MOCK_PROVIDERS) {
      builder.overrideProvider(provider.provide).useValue(provider.useValue);
    }

    const moduleFixture: TestingModule = await builder.compile();
    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

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

  describe('Quest Full Lifecycle', () => {
    let childToken: string;
    let parentToken: string;
    let questId: string;

    beforeAll(() => {
      childToken = makeToken(jwtService, { id: 'user-child-1', email: 'child@udb.dev', role: 'CHILD' });
      parentToken = makeToken(jwtService, { id: 'user-parent-1', email: 'parent@udb.dev', role: 'PARENT' });
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
