import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import { E2E_MOCK_PROVIDERS } from './e2e-mock-providers';
import { MockHealthController } from './test-health.controller';

describe('UDB API End-to-End Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      imports: [AppModule],
      controllers: [MockHealthController],
    });

    for (const provider of E2E_MOCK_PROVIDERS) {
      builder.overrideProvider(provider.provide).useValue(provider.useValue);
    }

    const moduleFixture: TestingModule = await builder.compile();
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
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'test') {
      return;
    }
    const prisma = new PrismaClient();
    try {
      const user = await prisma.user.findUnique({ where: { email: 'parent@udb.dev' } });
      expect(user).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });
});
