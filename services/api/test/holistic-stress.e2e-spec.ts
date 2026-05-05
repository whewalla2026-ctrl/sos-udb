import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { AuthService } from '../src/auth/auth.service';
import { MonteCarloService } from '../src/ai/monte-carlo.service';
import { ConfigModule } from '@nestjs/config';
import { GqlAuthGuard } from '../src/auth/guards/gql-auth.guard';
import { GqlExecutionContext } from '@nestjs/graphql';

jest.setTimeout(60000);

describe('UDB Holistic Stress & Integration Test (All 5 Phases)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ 
          isGlobal: true,
          load: [() => ({ JWT_SECRET: 'test-secret' })]
        }),
        AppModule
      ],
    })
    .overrideProvider(AiService)
    .useValue({
      generateFutureSelfNarrative: jest.fn().mockResolvedValue('Mock narrative'),
      runSocraticSession: jest.fn().mockResolvedValue({ response: 'Hint', intent: 'HELP' }),
      generateBusinessPlan: jest.fn().mockResolvedValue({ executiveSummary: 'Plan', isValid: true }),
      analyzeEmotionalState: jest.fn().mockResolvedValue({ emotion: 'Happy', focusScore: 90, resilienceLevel: 'High' }),
      triggerSkillAgent: jest.fn().mockResolvedValue('[]'),
      calculateAvatarEvolution: jest.fn().mockResolvedValue([{ trait: 'AURA', value: 'GOLD', intensity: 1 }]),
      getCoachingInsight: jest.fn().mockResolvedValue('You are doing great!'),
    })
    .overrideProvider(MonteCarloService)
    .useValue({
      runSimulation: jest.fn().mockResolvedValue({
        pathways: { academicMastery: 8, financialIndependence: 7, wellnessScore: 9 },
        p50: { academic: 85, financial: 70, wellness: 80 }
      })
    })
    .overrideProvider(AuthService)
    .useValue({
      verifyToken: jest.fn().mockResolvedValue({ id: 'test-user', role: 'CHILD' }),
    })
    .overrideGuard(GqlAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        const ctx = GqlExecutionContext.create(context).getContext();
        ctx.req = ctx.req || {};
        ctx.req.user = { id: 'test-user', role: 'CHILD' };
        return true;
      }
    })
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Phase 1-5 Integrated Lifecycle Flow', async () => {
    const gql = (query: string, variables = {}) => 
      request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', 'Bearer test')
        .send({ query, variables });

    // 1. Phase 1: Biometric Sync
    const logBio = `mutation { logBiometric(data: "{\\"sleepHours\\": 8, \\"focusScore\\": 85}") }`;
    await gql(logBio).expect(200);

    // 2. Phase 2: AI Tutor Interaction
    const askTutor = `mutation { askTutor(sessionId: "1", input: "How to solve x^2=4?", subject: "Math") { response } }`;
    await gql(askTutor).expect(200);

    // 3. Phase 3: Entrepreneurship / Venture
    const createVenture = `mutation { createVenture(name: "Lemonade", problem: "Thirst", solution: "Drinks", targetMarket: "Local", pricingModel: "$1") }`;
    await gql(createVenture).expect(200);

    // 4. Phase 4: Future Simulation
    const runSim = `mutation { runFutureSimulation { narrative } }`;
    await gql(runSim).expect(200);

    // 5. Phase 5: mEQ & Skill Agents
    const analyzeEmotion = `mutation { analyzeEmotionalState(videoUrl: "test", transcript: "feeling good") { emotion } }`;
    await gql(analyzeEmotion).expect(200);

    const deployAgent = `mutation { deploySkillAgent(skillName: "Rust") { id } }`;
    await gql(deployAgent).expect(200);
  });

  it('System Stress Test: High-Concurrency GraphQL Requests', async () => {
    const query = `query { coachingInsight }`;
    const concurrency = 50;
    
    const requests = Array.from({ length: concurrency }).map(() => 
      request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', 'Bearer test')
        .send({ query })
    );

    const results = await Promise.all(requests);
    results.forEach(res => {
      if (res.status !== 200) console.error('Stress Error:', res.body);
      expect(res.status).toBe(200);
    });
  });

  it('Monte Carlo Engine Stress: Sequential High-Load Simulations', async () => {
    const query = `mutation { runFutureSimulation { narrative } }`;
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', 'Bearer test')
        .send({ query });
      if (res.body.errors) console.error('GQL Error:', JSON.stringify(res.body.errors));
      expect(res.status).toBe(200);
      expect(res.body.data?.runFutureSimulation?.narrative).toBeDefined();
    }
  });
});
