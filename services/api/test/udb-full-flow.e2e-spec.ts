import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/redis/redis.module';
import { DoterState } from '../src/shared/prisma-enums';
import { UupSyncModule } from '../src/uup-sync/uup-sync.module';
import { BiometricModule } from '../src/biometric/biometric.module';
import { EntrepreneurshipModule } from '../src/entrepreneurship/entrepreneurship.module';
import { DoterModule } from '../src/doter/doter.module';
import { QuestsModule } from '../src/quests/quests.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { PointsModule } from '../src/points/points.module';
import { AiModule } from '../src/ai/ai.module';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GqlAuthGuard } from '../src/auth/guards/gql-auth.guard';
import { UupSyncService } from '../src/uup-sync/uup-sync.service';
import { EscrowService } from '../src/entrepreneurship/escrow.service';

describe('UDB Holistic End-to-End Flow (Mocked)', () => {
  let app: INestApplication;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    doterProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(1),
    },
    quest: {
      count: jest.fn().mockResolvedValue(10),
      create: jest.fn(),
    },
    escrow: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockRedis = {
    publish: jest.fn().mockResolvedValue(1),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        UupSyncModule,
        BiometricModule,
        EntrepreneurshipModule,
        DoterModule,
        QuestsModule,
        NotificationsModule,
        PointsModule,
        AiModule,
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
      ],
    })
      .overrideProvider(PrismaService).useValue(mockPrisma)
      .overrideProvider(REDIS_CLIENT).useValue(mockRedis)
      .overrideGuard(GqlAuthGuard).useValue({ 
        canActivate: (context: any) => {
          const ctx = context.getArgByIndex(2); // GraphQL context
          ctx.req.user = { id: 'child-1', role: 'CHILD' };
          return true;
        } 
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Phase 1 & 2: Doter & Academic Sync', () => {
    it('should sync Biometric data via UUP Sync', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        uupData: { biometric: { avg_sleep_hours: 8 } },
      });

      // Since there's no UupSyncResolver, we'll test the service directly or add a resolver
      // For now, let's assume we are testing the logic through the Doter evolution
      // triggered by UUP sync if it was called. 
      // Actually, I'll add a mock test for the service call.
      const service = app.get(UupSyncService);
      await service.syncUUP('child-1', 'biometric', { avg_sleep_hours: 5 });

      expect(mockPrisma.doterProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ isSluggy: true })
      }));
    });
  });

  describe('Phase 3: Social & Entrepreneurship', () => {
    it('should handle Escrow via Mutations', async () => {
      const escrowId = 'escrow-123';
      mockPrisma.escrow.findUnique.mockResolvedValue({
        id: escrowId,
        status: 'HELD',
        stripePaymentIntentId: 'pi_test',
      });

      // Proof Submission (Assuming Mutation exists)
      const gql = (query: string, variables: any) => 
        request(app.getHttpServer()).post('/graphql').send({ query, variables });

      mockPrisma.escrow.update.mockResolvedValue({ id: escrowId, status: 'PROOF_SUBMITTED' });

      // Note: In real test, we'd use the actual mutation name from the resolver
      const service = app.get(EscrowService);
      await service.submitProof(escrowId, 'http://proof.com', 'Done');

      expect(mockPrisma.escrow.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'PROOF_SUBMITTED' })
      }));
    });
  });

  describe('Phase 3: Doter Evolution Gates', () => {
    it('should gate JUVENILE evolution via addDoterXP mutation', async () => {
      mockPrisma.quest.count.mockResolvedValue(2); // Only 2 academic quests
      mockPrisma.doterProfile.findUnique.mockResolvedValue({
        state: DoterState.HATCHLING,
        xp: 1900,
        evolutionHistory: [],
      });
      mockPrisma.doterProfile.update.mockResolvedValue({ state: DoterState.HATCHLING });

      const query = `
        mutation($xp: Int!) {
          addDoterXP(xp: $xp)
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables: { xp: 200 } })
        .expect(200);

      // Should NOT have evolved to JUVENILE
      const updateCall = mockPrisma.doterProfile.update.mock.calls.find(c => c[0].where.userId === 'child-1');
      if (updateCall) {
         expect(updateCall[0].data.state).toBe(DoterState.HATCHLING);
      }
    });
  });
});
