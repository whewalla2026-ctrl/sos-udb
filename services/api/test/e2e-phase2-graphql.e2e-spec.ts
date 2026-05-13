import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GqlAuthGuard } from '../src/auth/guards/gql-auth.guard';

describe('Phase 2 GraphQL (Introspection) with Guard Bypass', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
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
    expect(res.body).toHaveProperty('data');
  });
});
