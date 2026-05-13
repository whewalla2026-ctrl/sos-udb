import { Test, TestingModule } from '@nestjs/testing';
import { TutorService } from './tutor.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.module';
import { MetricsService } from '../shared/metrics.controller';

describe('TutorService', () => {
  let service: TutorService;
  let prisma: any;
  let ai: any;
  let redis: any;

  const mockPrisma = {
    tutoringSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    tutorInteraction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    tutorEvaluation: {
      create: jest.fn(),
    },
    tutorMemory: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    topicMastery: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    tutorAnalytics: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockAi = {
    runSocraticSession: jest.fn(),
  };

  const mockRedis = {
    setex: jest.fn(),
    del: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-32-chars-minimum!!';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
        { provide: MetricsService, useValue: { tutoringSessions: { inc: jest.fn() }, httpRequestsTotal: { inc: jest.fn() }, httpRequestDuration: { observe: jest.fn() } } },
      ],
    }).compile();

    service = module.get<TutorService>(TutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a tutoring session and cache it in redis', async () => {
      mockPrisma.tutoringSession.create.mockResolvedValue({ id: 'session-1', userId: 'user-1', subject: 'math' });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.createSession('user-1', 'math');

      expect(mockPrisma.tutoringSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', subject: 'math', assignmentId: null },
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'tutor:session:session-1',
        3600,
        expect.any(String),
      );
      expect(result).toEqual({ id: 'session-1', userId: 'user-1', subject: 'math' });
    });

    it('should pass assignmentId when provided', async () => {
      mockPrisma.tutoringSession.create.mockResolvedValue({ id: 's1', userId: 'u1', subject: 'science', assignmentId: 'a1' });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.createSession('u1', 'science', 'a1');

      expect(mockPrisma.tutoringSession.create).toHaveBeenCalledWith({
        data: { userId: 'u1', subject: 'science', assignmentId: 'a1' },
      });
      expect(result.assignmentId).toBe('a1');
    });
  });

  describe('getSession', () => {
    it('should return a session by id', async () => {
      mockPrisma.tutoringSession.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', subject: 'math' });

      const result = await service.getSession('s1');

      expect(result).toEqual({ id: 's1', userId: 'u1', subject: 'math' });
    });

    it('should throw if session not found', async () => {
      mockPrisma.tutoringSession.findUnique.mockResolvedValue(null);

      await expect(service.getSession('nonexistent')).rejects.toThrow('Session not found');
    });
  });

  describe('getUserSessions', () => {
    it('should return recent sessions for a user', async () => {
      mockPrisma.tutoringSession.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

      const result = await service.getUserSessions('u1', 5);

      expect(mockPrisma.tutoringSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('ask', () => {
    it('should process a question and create interactions', async () => {
      const session = { id: 's1', userId: 'u1', subject: 'math', sessionLog: [] };
      mockPrisma.tutoringSession.findUnique.mockResolvedValue(session);
      mockAi.runSocraticSession.mockResolvedValue({
        response: 'Great question! What do you know about X?',
        intent: 'EXPLORING',
        pathEntry: 'input text',
      });
      mockPrisma.tutorInteraction.create.mockResolvedValue({});
      mockPrisma.tutoringSession.update.mockResolvedValue({});
      mockRedis.del.mockResolvedValue(1);
      mockPrisma.tutorEvaluation.create.mockResolvedValue({});
      mockPrisma.tutorInteraction.findMany.mockResolvedValue([]);
      mockPrisma.tutoringSession.findMany.mockResolvedValue([session]);
      mockPrisma.topicMastery.findMany.mockResolvedValue([]);

      const result = await service.ask('u1', 's1', 'Can you help me with algebra?');

      expect(mockAi.runSocraticSession).toHaveBeenCalledWith('u1', 's1', 'Can you help me with algebra?', 'math', []);
      expect(mockPrisma.tutorInteraction.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.tutoringSession.update).toHaveBeenCalled();
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('evaluation');
    });
  });

  describe('evaluateTutorResponse', () => {
    it('should return quality scores', async () => {
      const result = await service.evaluateTutorResponse(
        'Let me help you understand algebra. What is 2+2?',
        'Can you help me with algebra?',
        'math',
      );

      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('hallucinationRisk');
      expect(result).toHaveProperty('safetyCheck');
      expect(result).toHaveProperty('relevance');
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.safetyCheck).toBe(true);
    });

    it('should flag unsafe content', async () => {
      const result = await service.evaluateTutorResponse(
        'This contains harmful content about self-harm',
        'test input',
        'health',
      );

      expect(result.safetyCheck).toBe(false);
    });
  });

  describe('endSession', () => {
    it('should end a session with duration', async () => {
      const createdAt = new Date(Date.now() - 60000);
      mockPrisma.tutoringSession.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', createdAt });
      mockPrisma.tutoringSession.update.mockResolvedValue({});
      mockPrisma.tutorInteraction.findMany.mockResolvedValue([]);
      mockPrisma.tutoringSession.findMany.mockResolvedValue([]);
      mockPrisma.topicMastery.findMany.mockResolvedValue([]);

      const result = await service.endSession('s1');

      expect(result.ended).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should throw if session not found', async () => {
      mockPrisma.tutoringSession.findUnique.mockResolvedValue(null);

      await expect(service.endSession('nonexistent')).rejects.toThrow('Session not found');
    });
  });

  describe('trackTopicMastery', () => {
    it('should upsert topic mastery', async () => {
      mockPrisma.topicMastery.findUnique.mockResolvedValue(null);

      await service.trackTopicMastery('u1', 'math', 'algebra', true);

      expect(mockPrisma.topicMastery.upsert).toHaveBeenCalled();
    });
  });

  describe('getRecommendations', () => {
    it('should return topics needing improvement', async () => {
      mockPrisma.topicMastery.findMany.mockResolvedValue([
        { subject: 'math', topic: 'algebra', masteryLevel: 0.3 },
        { subject: 'math', topic: 'geometry', masteryLevel: 0.1 },
      ]);

      const result = await service.getRecommendations('u1');

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe('medium');
      expect(result[1].priority).toBe('high');
    });
  });
});
