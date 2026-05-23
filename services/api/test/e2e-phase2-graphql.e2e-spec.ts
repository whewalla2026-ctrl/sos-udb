import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GqlAuthGuard } from '../src/auth/guards/gql-auth.guard';
import { E2E_MOCK_PROVIDERS } from './e2e-mock-providers';

describe('Phase 2 GraphQL (Introspection) with Guard Bypass', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: () => true });

    for (const provider of E2E_MOCK_PROVIDERS) {
      builder.overrideProvider(provider.provide).useValue(provider.useValue);
    }

    const module: TestingModule = await builder.compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('introspection should return schema (unauthenticated)', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ __schema { types { name } } }' })
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.__schema).toBeDefined();
    expect(Array.isArray(res.body.data.__schema.types)).toBe(true);
  });
});
