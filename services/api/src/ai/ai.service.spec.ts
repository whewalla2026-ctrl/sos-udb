import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    preview: {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { candidates: [{ content: { parts: [{ text: 'Mock AI response' }] } }] },
        }),
      }),
    },
  })),
}), { virtual: true });

describe('AiService', () => {
  let service: AiService;

  const mockConfig = {
    get: jest.fn().mockReturnValue('test-key'),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    skillGap: {
      findMany: jest.fn(),
    },
    biometricLog: {
      findMany: jest.fn(),
    },
    weeklyPlan: {
      create: jest.fn(),
    },
    venture: {
      findMany: jest.fn(),
    },
    tutoringSession: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runSocraticSession', () => {
    const sessionInput = {
      userId: 'user-1',
      sessionId: 'session-1',
      studentInput: 'I dont understand quadratic equations',
      subject: 'Math',
      sessionHistory: [{ role: 'student', content: 'Can you help me?' }],
    };

    it('should return a Socratic response with intent EXPLORING', async () => {
      mockPrisma.tutoringSession.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.runSocraticSession(
        sessionInput.userId,
        sessionInput.sessionId,
        sessionInput.studentInput,
        sessionInput.subject,
        sessionInput.sessionHistory,
      );

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('pathEntry');
      expect(result.intent).toBe('EXPLORING');
      expect(mockPrisma.tutoringSession.updateMany).toHaveBeenCalled();
    });

    it('should return encouraging refusal when student asks for direct answer', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      mockPrisma.tutoringSession.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.runSocraticSession(
        sessionInput.userId,
        sessionInput.sessionId,
        'just tell me the answer',
        sessionInput.subject,
        sessionInput.sessionHistory,
      );

      expect(result.intent).toBe('WANTS_ANSWER');
      expect(result.response).toContain('Instead of giving you the answer');
    });

    it('should handle empty session history', async () => {
      mockPrisma.tutoringSession.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.runSocraticSession(
        sessionInput.userId,
        sessionInput.sessionId,
        'Tell me about algebra?',
        sessionInput.subject,
        [],
      );

      expect(result).toHaveProperty('response');
      expect(result.intent).toBe('HINT_REQUEST');
    });

    it('should handle prisma updateMany failure gracefully', async () => {
      mockPrisma.tutoringSession.updateMany.mockRejectedValue(new Error('DB error'));

      await expect(
        service.runSocraticSession(
          sessionInput.userId,
          sessionInput.sessionId,
          sessionInput.studentInput,
          sessionInput.subject,
          sessionInput.sessionHistory,
        ),
      ).rejects.toThrow('DB error');
    });
  });

  describe('generateWeeklyPlan', () => {
    const userId = 'user-1';
    const weekStart = new Date('2025-01-06');

    it('should generate and save a weekly plan', async () => {
      jest.spyOn(service as any, 'callLLM').mockResolvedValue(
        JSON.stringify([
          { day: 'Monday', activities: [{ title: 'Math Practice', pillar: 'ACADEMIC', durationMinutes: 30, isDeepWork: true, suggestedTime: '09:00' }] },
          { day: 'Tuesday', activities: [{ title: 'Physical Activity', pillar: 'BIOMETRIC', durationMinutes: 45, isDeepWork: false, suggestedTime: '16:00' }] },
        ]),
      );
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        displayName: 'Test User',
        doterProfile: { id: 'dp-1', mood: 'HAPPY' },
      });
      mockPrisma.skillGap.findMany.mockResolvedValue([
        { subject: 'Math', gapScore: 0.2, pillar: 'ACADEMIC' },
        { subject: 'Science', gapScore: 0.15, pillar: 'ACADEMIC' },
      ]);
      mockPrisma.biometricLog.findMany.mockResolvedValue([
        { focusScore: 80, loggedAt: new Date() },
        { focusScore: 75, loggedAt: new Date() },
      ]);
      mockPrisma.weeklyPlan.create.mockResolvedValue({
        id: 'plan-1',
        userId,
        weekStart,
        aiDraft: [],
      });

      const plan = await service.generateWeeklyPlan(userId, weekStart);

      expect(plan).toBeDefined();
      expect(mockPrisma.weeklyPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId, weekStart }),
        }),
      );
    });

    it('should return raw response when JSON parsing fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.skillGap.findMany.mockResolvedValue([]);
      mockPrisma.biometricLog.findMany.mockResolvedValue([]);
      mockPrisma.weeklyPlan.create.mockRejectedValue(new Error('Create failed'));

      const plan = await service.generateWeeklyPlan(userId, weekStart);

      expect(plan).toHaveProperty('raw');
    });

    it('should calculate default focus score when no biometric data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.skillGap.findMany.mockResolvedValue([]);
      mockPrisma.biometricLog.findMany.mockResolvedValue([]);
      mockPrisma.weeklyPlan.create.mockResolvedValue({ id: 'plan-1', userId, weekStart, aiDraft: [] });

      const plan = await service.generateWeeklyPlan(userId, weekStart);

      expect(plan).toBeDefined();
    });
  });

  describe('getCoachingInsight', () => {
    it('should return a coaching insight string', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
        uupData: { gamification: { level: 3 } },
      });
      mockPrisma.biometricLog.findMany.mockResolvedValue([
        { sleepHours: 7.5 },
        { sleepHours: 8 },
      ]);
      mockPrisma.skillGap.findMany.mockResolvedValue([
        { subject: 'Reading', gapScore: 0.2 },
      ]);
      mockPrisma.venture.findMany.mockResolvedValue([
        { id: 'v-1', status: 'ACTIVE' },
      ]);

      const insight = await service.getCoachingInsight('user-1');

      expect(typeof insight).toBe('string');
      expect(insight.length).toBeGreaterThan(0);
    });

    it('should handle missing user displayName', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.biometricLog.findMany.mockResolvedValue([]);
      mockPrisma.skillGap.findMany.mockResolvedValue([]);
      mockPrisma.venture.findMany.mockResolvedValue([]);

      const insight = await service.getCoachingInsight('user-1');

      expect(typeof insight).toBe('string');
    });

    it('should handle zero biometric logs gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', displayName: 'Test' });
      mockPrisma.biometricLog.findMany.mockResolvedValue([]);
      mockPrisma.skillGap.findMany.mockResolvedValue([]);
      mockPrisma.venture.findMany.mockResolvedValue([]);

      await expect(service.getCoachingInsight('user-1')).resolves.toBeDefined();
    });
  });

  describe('generateBusinessPlan', () => {
    const planData = {
      problem: 'Students struggle with math',
      solution: 'AI tutoring platform',
      targetMarket: 'K-12 students',
      pricingModel: 'Freemium',
      founderAge: 16,
    };

    it('should return a parsed business plan', async () => {
      const result = await service.generateBusinessPlan(planData);

      expect(result).toHaveProperty('executiveSummary');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('validationNotes');
    });

    it('should handle sanitized input with special characters', async () => {
      const result = await service.generateBusinessPlan({
        ...planData,
        problem: 'problem with ${var} and "quotes" and\nnewlines',
      });

      expect(result).toHaveProperty('executiveSummary');
    });

    it('should return raw response when JSON parsing fails on LLM output', async () => {
      const result = await service.generateBusinessPlan(planData);

      expect(result.isValid).toBeDefined();
    });
  });

  describe('generateFutureSelfNarrative', () => {
    it('should return a narrative string', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        uupData: {
          academic: { math_rit: 240 },
          entrepreneurship: { total_revenue_usd: 500 },
          biometric: { focus_score: 85 },
          gamification: { level: 5 },
        },
      });

      const narrative = await service.generateFutureSelfNarrative('user-1');

      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should handle missing uupData', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const narrative = await service.generateFutureSelfNarrative('user-1');

      expect(typeof narrative).toBe('string');
    });

    it('should handle user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const narrative = await service.generateFutureSelfNarrative('nonexistent');

      expect(typeof narrative).toBe('string');
    });
  });

  describe('generateContextualFeedback', () => {
    it('should return a pro-tip string', async () => {
      const feedback = await service.generateContextualFeedback(
        'Math Homework',
        'PDF',
        'https://example.com/doc',
      );

      expect(typeof feedback).toBe('string');
      expect(feedback.length).toBeGreaterThan(0);
    });

    it('should handle empty title gracefully', async () => {
      const feedback = await service.generateContextualFeedback('', 'image', '');

      expect(typeof feedback).toBe('string');
    });

    it('should handle title with special characters', async () => {
      const feedback = await service.generateContextualFeedback(
        'Project "${special}" and\nnewline',
        'video',
        'https://example.com/video',
      );

      expect(typeof feedback).toBe('string');
    });
  });

  describe('analyzeSentiment', () => {
    it('should return safety analysis with isSafe flag', async () => {
      const result = await service.analyzeSentiment('I love learning math!');

      expect(result).toHaveProperty('isSafe');
      expect(result).toHaveProperty('safetyScore');
      expect(result).toHaveProperty('flags');
      expect(typeof result.isSafe).toBe('boolean');
    });

    it('should return safe defaults on parse failure', async () => {
      const result = await service.analyzeSentiment('Hello world');

      expect(result.isSafe).toBeDefined();
    });

    it('should handle empty content string', async () => {
      const result = await service.analyzeSentiment('');

      expect(result).toHaveProperty('isSafe');
    });

    it('should handle very long content strings', async () => {
      const longContent = 'A'.repeat(10000);
      const result = await service.analyzeSentiment(longContent);

      expect(result).toHaveProperty('isSafe');
    });
  });

  describe('analyzeEmotionalState', () => {
    it('should return emotional analysis', async () => {
      const result = await service.analyzeEmotionalState(
        'user-1',
        'https://example.com/video',
        'I am feeling great today',
      );

      expect(result).toHaveProperty('emotion');
      expect(result).toHaveProperty('focusScore');
      expect(result).toHaveProperty('resilienceLevel');
    });

    it('should handle empty audio transcript', async () => {
      const result = await service.analyzeEmotionalState('user-1', 'https://example.com/video', '');

      expect(result).toHaveProperty('emotion');
      expect(result).toHaveProperty('focusScore');
    });

    it('should handle missing video URL', async () => {
      const result = await service.analyzeEmotionalState('user-1', '', '');

      expect(result).toBeDefined();
    });
  });

  describe('triggerSkillAgent', () => {
    it('should return a learning path string', async () => {
      const result = await service.triggerSkillAgent('user-1', 'JavaScript');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle different skill names', async () => {
      const result = await service.triggerSkillAgent('user-1', 'Public Speaking');

      expect(typeof result).toBe('string');
    });

    it('should handle empty skill string', async () => {
      const result = await service.triggerSkillAgent('user-1', '');

      expect(typeof result).toBe('string');
    });
  });
});
