import { Test, TestingModule } from '@nestjs/testing';
import { OfflineTutorService, OfflineTutorSession } from './offline-tutor.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('OfflineTutorService', () => {
  let service: OfflineTutorService;

  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    mget: jest.fn(),
    scan: jest.fn(),
  };

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockSession: OfflineTutorSession = {
    sessionId: 'session-1',
    userId: 'user-1',
    messages: [],
    turnCount: 0,
    isOffline: true,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.mget.mockResolvedValue([]);
    mockRedis.scan.mockResolvedValue(['0', []]);
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'PARENT' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineTutorService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OfflineTutorService>(OfflineTutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processOfflineMessage', () => {
    it('should create a new session and store in Redis with TTL', async () => {
      const result = await service.processOfflineMessage({
        userId: 'user-1',
        message: 'help me understand algebra',
        grade: 6,
      });

      expect(result.sessionId).toBeDefined();
      expect(result.isOfflineMode).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^offline-tutor:session:/),
        3600,
        expect.any(String),
      );
    });

    it('should reuse existing session when sessionId is provided', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.processOfflineMessage({
        userId: 'user-1',
        sessionId: 'session-1',
        message: 'how do i solve this?',
        grade: 6,
      });

      expect(result.sessionId).toBe('session-1');
      expect(mockRedis.get).toHaveBeenCalledWith('offline-tutor:session:session-1');
    });

    it('should refuse to give direct answers', async () => {
      const result = await service.processOfflineMessage({
        userId: 'user-1',
        message: 'what is the answer to 2+2?',
        grade: 3,
      });

      expect(result.response).toContain('think');
      expect(result.isOfflineMode).toBe(true);
    });

    it('should block graded assignment attempts', async () => {
      const result = await service.processOfflineMessage({
        userId: 'user-1',
        message: 'help me with my homework due tomorrow',
        grade: 9,
      });

      expect(result.response).toContain('graded');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getSession / Redis read', () => {
    it('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await (service as any).getSession('nonexistent');
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('offline-tutor:session:nonexistent');
    });

    it('should return parsed session when found in Redis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await (service as any).getSession('session-1');
      expect(result).toEqual(mockSession);
    });
  });

  describe('saveSession to Redis', () => {
    it('should store session with 3600s TTL', async () => {
      await (service as any).saveSession(mockSession);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'offline-tutor:session:session-1',
        3600,
        JSON.stringify(mockSession),
      );
    });
  });

  describe('syncSession', () => {
    it('should return synced=true when no unsynced messages', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await service.syncSession('session-1');
      expect(result.synced).toBe(true);
      expect(result.pending).toBe(0);
    });

    it('should sync unsynced messages to audit log', async () => {
      const sessionWithMessages = {
        ...mockSession,
        messages: [
          { role: 'user', content: 'hello', timestamp: new Date(), synced: false },
        ],
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionWithMessages));

      const result = await service.syncSession('session-1');

      expect(result.synced).toBe(true);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return pending count when audit log fails', async () => {
      const sessionWithMessages = {
        ...mockSession,
        messages: [
          { role: 'user', content: 'hello', timestamp: new Date(), synced: false },
        ],
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionWithMessages));
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB down'));

      const result = await service.syncSession('session-1');

      expect(result.pending).toBe(1);
    });
  });

  describe('getOfflineSessions with Redis SCAN', () => {
    it('should return sessions for a given userId', async () => {
      mockRedis.scan.mockResolvedValue(['0', ['offline-tutor:session:s1']]);
      mockRedis.mget.mockResolvedValue([JSON.stringify(mockSession)]);

      const sessions = await service.getOfflineSessions('user-1');

      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe('user-1');
      expect(mockRedis.scan).toHaveBeenCalledWith(
        '0', 'MATCH', 'offline-tutor:session:*', 'COUNT', '100',
      );
    });

    it('should filter sessions by userId', async () => {
      const otherSession = { ...mockSession, userId: 'user-2' };
      mockRedis.scan.mockResolvedValue(['0', ['offline-tutor:session:s1', 'offline-tutor:session:s2']]);
      mockRedis.mget.mockResolvedValue([JSON.stringify(mockSession), JSON.stringify(otherSession)]);

      const sessions = await service.getOfflineSessions('user-1');

      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe('user-1');
    });

    it('should handle paginated SCAN cursor', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['offline-tutor:session:s1']])
        .mockResolvedValueOnce(['0', ['offline-tutor:session:s2']]);
      mockRedis.mget
        .mockResolvedValueOnce([JSON.stringify({ ...mockSession, userId: 'user-1' })])
        .mockResolvedValueOnce([JSON.stringify({ ...mockSession, sessionId: 's2', userId: 'user-1' })]);

      const sessions = await service.getOfflineSessions('user-1');

      expect(sessions).toHaveLength(2);
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkOfflineModeEnabled', () => {
    it('should return true for PARENT role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'PARENT' });

      const result = await service.checkOfflineModeEnabled('user-1');
      expect(result).toBe(true);
    });

    it('should return false for non-PARENT role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'STUDENT' });

      const result = await service.checkOfflineModeEnabled('user-1');
      expect(result).toBe(false);
    });
  });
});
