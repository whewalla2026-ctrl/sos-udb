import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { MessagingService } from '../src/messaging/messaging.service';
import { SafetyService } from '../src/safety/safety.service';
import { REDIS_CLIENT } from '../src/redis/redis.module';
import { PointsService } from '../src/points/points.service';
import { MockHealthController } from './test-health.controller';

describe('UDB API End-to-End Tests (e2e)', () => {
  let app: INestApplication;

  // Mock implementations for real-DB e2e bootstrap
  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@udb.com', uupData: { gamification: { xp: 100 } } }),
      update: jest.fn().mockResolvedValue({}),
    },
    activity: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'act-1', title: 'Deep Work' }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({})
    }
  };

  const mockRedisClient = {
    publish: jest.fn().mockResolvedValue(1)
  };

  const mockSafetyService = {
    analyzeMessage: jest.fn().mockResolvedValue({ isSafe: true, safetyScore: 0, flags: [] }),
    recordSafetyScore: jest.fn().mockResolvedValue(null),
  };

  const mockMessagingService = {
    sendMessage: jest.fn().mockResolvedValue(null),
    getConversation: jest.fn().mockResolvedValue([]),
    getInbox: jest.fn().mockResolvedValue([]),
  };

  const mockPointsService = {
    awardPoints: jest.fn().mockResolvedValue(null),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [MockHealthController],
    })
      .overrideProvider(PrismaService).useValue(mockPrismaService)
      .overrideProvider(REDIS_CLIENT).useValue(mockRedisClient)
      .overrideProvider(MessagingService).useValue(mockMessagingService)
      .overrideProvider(SafetyService).useValue(mockSafetyService)
      .overrideProvider(PointsService).useValue(mockPointsService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) should return OK', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'OK', service: 'udb-api' });
  });

  it('DB: seeded user should exist', async () => {
    const prisma = new PrismaClient();
    try {
      const user = await prisma.user.findUnique({ where: { email: 'parent@udb.dev' } });
      expect(user).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });
});
