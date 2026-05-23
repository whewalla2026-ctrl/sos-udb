import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GqlAuthGuard } from '../src/auth/guards/gql-auth.guard';
import { E2E_MOCK_PROVIDERS } from './e2e-mock-providers';

describe('Firebase Auth (e2e)', () => {
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

  it('should have loginWithFirebase mutation in schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: `{ __schema { types { name fields { name } } } }` })
      .expect(200);

    const mutationTypes = res.body.data.__schema.types.filter((t: any) => t.name === 'Mutation');
    expect(mutationTypes.length).toBe(1);
    const mutationFieldNames = mutationTypes[0].fields.map((f: any) => f.name);
    expect(mutationFieldNames).toContain('loginWithFirebase');
    expect(mutationFieldNames).toContain('setFirebaseCustomClaim');
    expect(mutationFieldNames).toContain('logout');
  });

  it('should return error when calling loginWithFirebase without Firebase configured', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `mutation { loginWithFirebase(idToken: "fake-token") { accessToken userId } }`,
      })
      .expect(200);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/Firebase not configured/i);
  });

  it('should have AuthPayload type with expected fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: `{ __type(name: "AuthPayload") { fields { name type { name kind } } } }` })
      .expect(200);

    const fields = res.body.data.__type.fields.map((f: any) => f.name);
    expect(fields).toContain('accessToken');
    expect(fields).toContain('refreshToken');
    expect(fields).toContain('userId');
    expect(fields).toContain('email');
    expect(fields).toContain('role');
  });

  it('should include firebase admin mutations when admin role', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: `{ __schema { mutationType { fields { name args { name type { name kind } } } } } }` })
      .expect(200);

    const fields = res.body.data.__schema.mutationType.fields;
    const setClaimField = fields.find((f: any) => f.name === 'setFirebaseCustomClaim');
    expect(setClaimField).toBeDefined();
    const argNames = setClaimField.args.map((a: any) => a.name);
    expect(argNames).toContain('uid');
    expect(argNames).toContain('role');
  });
});
