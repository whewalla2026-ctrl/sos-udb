import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/redis/redis.module';
import { RedisService } from '../src/redis/redis.service';
import { MessagingService } from '../src/messaging/messaging.service';
import { SafetyService } from '../src/safety/safety.service';
import { PointsService } from '../src/points/points.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUES } from '../src/queue/queue.module';

export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
  getJob: jest.fn().mockResolvedValue(null),
  getJobs: jest.fn().mockResolvedValue([]),
  getActive: jest.fn().mockResolvedValue([]),
  getWaiting: jest.fn().mockResolvedValue([]),
  getCompleted: jest.fn().mockResolvedValue([]),
  getFailed: jest.fn().mockResolvedValue([]),
  isReady: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(undefined),
};

export const mockPrismaService = {
  user: {
    findUnique: jest.fn().mockImplementation(({ where }: any) => {
      if (where?.id === 'user-child-1' || where?.email === 'child@udb.dev')
        return Promise.resolve({ id: 'user-child-1', email: 'child@udb.dev', role: 'CHILD', displayName: 'Test Child', avatarUrl: null, uupData: { gamification: { xp: 0, doter_level: 1 }, biometric: { avg_sleep_hours: 7 }, academic: {} }, accessibilitySettings: {}, dateOfBirth: null, createdAt: new Date() });
      if (where?.id === 'user-parent-1' || where?.email === 'parent@udb.dev')
        return Promise.resolve({ id: 'user-parent-1', email: 'parent@udb.dev', role: 'PARENT', displayName: 'Test Parent', avatarUrl: null, uupData: { gamification: { xp: 0, doter_level: 1 }, biometric: { avg_sleep_hours: 7 }, academic: {} }, accessibilitySettings: {}, dateOfBirth: null, createdAt: new Date() });
      if (where?.id === 'user-admin-1' || where?.email === 'admin@udb.dev')
        return Promise.resolve({ id: 'user-admin-1', email: 'admin@udb.dev', role: 'ADMIN', displayName: 'Test Admin', avatarUrl: null, uupData: { gamification: { xp: 0, doter_level: 1 }, biometric: { avg_sleep_hours: 7 }, academic: {} }, accessibilitySettings: {}, dateOfBirth: null, createdAt: new Date() });
      return Promise.resolve(null);
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      if (where?.parentId) return Promise.resolve([]);
      return Promise.resolve([]);
    }),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-user-1', ...data })),
    update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'user-child-1', ...data })),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'upsert-user-1', ...create })),
    delete: jest.fn().mockResolvedValue({ id: 'user-child-1' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(42),
  },
  quest: {
    findUnique: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({
      id: where?.id || 'quest-1',
      userId: 'user-child-1',
      title: 'Test Quest',
      description: '',
      status: 'PENDING',
      pillar: 'ACADEMIC',
      xpReward: 100,
      coinReward: 50,
      goalId: null,
      dueDate: null,
      proofUrl: null,
      proofType: null,
      aiConfidence: null,
      aiVerified: false,
      isChunk: false,
      parentQuestId: null,
      chunkIndex: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-quest-1', ...data, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() })),
    update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'quest-1', userId: 'user-child-1', title: 'Test Quest', status: 'APPROVED', ...data })),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  familyLink: {
    findFirst: jest.fn().mockImplementation(({ where }: any) => {
      if (where?.parentId === 'user-parent-1' && where?.childId === 'user-child-1')
        return Promise.resolve({ id: 'link-1', parentId: 'user-parent-1', childId: 'user-child-1', consentVerified: true, createdAt: new Date() });
      return Promise.resolve(null);
    }),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-link-1', ...data })),
    upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'upsert-link-1', ...create })),
    delete: jest.fn().mockResolvedValue({ id: 'link-1' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  pointsLedger: {
    findFirst: jest.fn().mockResolvedValue({ id: 'ledger-1', userId: 'user-child-1', transactionType: 'EARN', amount: 100, balanceAfter: 500, source: 'QUEST', description: 'Test', status: 'SETTLED', createdAt: new Date() }),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-ledger-1', ...data })),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  goal: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
  activity: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'act-1' }),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  notification: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
  doterProfile: {
    findUnique: jest.fn().mockResolvedValue({ id: 'doter-1', state: 'EGG', name: 'Doter', level: 1, xp: 0, coinBalance: 0, streakDays: 0, isSluggy: false, isEnergetic: false }),
  },
  onboardingStatus: {
    count: jest.fn().mockResolvedValue(10),
  },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

export const mockRedisClient = {
  publish: jest.fn().mockResolvedValue(1),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
  disconnect: jest.fn(),
};

export const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  publish: jest.fn().mockResolvedValue(1),
  getClient: jest.fn().mockReturnValue(mockRedisClient),
};

export const mockEventEmitter = {
  emit: jest.fn().mockReturnValue(true),
  emitAsync: jest.fn().mockResolvedValue([]),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
};

export const mockMessagingService = {
  sendMessage: jest.fn().mockResolvedValue(null),
  getConversation: jest.fn().mockResolvedValue([]),
  getInbox: jest.fn().mockResolvedValue([]),
  moderateMessage: jest.fn().mockResolvedValue({ isAllowed: true, reason: null }),
};

export const mockSafetyService = {
  analyzeMessage: jest.fn().mockResolvedValue({ isSafe: true, safetyScore: 0, flags: [] }),
  recordSafetyScore: jest.fn().mockResolvedValue(null),
  getLatestSafetyScore: jest.fn().mockResolvedValue({ score: 85, trend: 'stable' }),
};

export const mockPointsService = {
  awardPoints: jest.fn().mockResolvedValue({ id: 'tx-1', transactionType: 'EARN', amount: 100, balanceAfter: 500 }),
  spendPoints: jest.fn().mockResolvedValue({ id: 'tx-2', transactionType: 'SPEND', amount: -200, balanceAfter: 300 }),
  getBalance: jest.fn().mockResolvedValue(1250),
  getLedger: jest.fn().mockResolvedValue({ entries: [], total: 0, page: 1, pageSize: 20 }),
};

export const E2E_MOCK_PROVIDERS: { provide: any; useValue: any }[] = [
  { provide: PrismaService, useValue: mockPrismaService },
  { provide: REDIS_CLIENT, useValue: mockRedisClient },
  { provide: RedisService, useValue: mockRedisService },
  { provide: EventEmitter2, useValue: mockEventEmitter },
  { provide: MessagingService, useValue: mockMessagingService },
  { provide: SafetyService, useValue: mockSafetyService },
  { provide: PointsService, useValue: mockPointsService },
  { provide: getQueueToken(QUEUES.SBT_MINT), useValue: mockQueue },
  { provide: getQueueToken(QUEUES.VISION), useValue: mockQueue },
  { provide: getQueueToken(QUEUES.ESCROW_PAYOUT), useValue: mockQueue },
  { provide: getQueueToken(QUEUES.DATA_EXPORT), useValue: mockQueue },
  { provide: getQueueToken(QUEUES.AI_INFERENCE), useValue: mockQueue },
  { provide: getQueueToken(QUEUES.UUP_SYNC), useValue: mockQueue },
];
