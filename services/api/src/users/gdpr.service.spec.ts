import { Test, TestingModule } from '@nestjs/testing';
import { GdprService } from './gdpr.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GdprService — Data Export & Deletion', () => {
  let service: GdprService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportUserData', () => {
    it('should return all user data in export format', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'child@example.com',
        displayName: 'Test Child',
        role: 'CHILD',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-06-01'),
        coppaConsentVerified: true,
        coppaConsentDate: new Date('2025-01-01'),
        gdprDeleteRequested: false,
        doterProfile: {
          grade: '5',
          learningStyle: 'visual',
          interests: ['science', 'math'],
          preferredSessionLength: 30,
          accessibilitySettings: {},
        },
        goals: [
          { id: 'g1', title: 'Learn Algebra', description: 'Master basic algebra', status: 'ACTIVE', targetDate: null, createdAt: new Date() },
        ],
        quests: [
          { id: 'q1', title: 'Math Quest', description: 'Complete math challenges', status: 'APPROVED', xpReward: 100, completedAt: new Date(), createdAt: new Date() },
        ],
        pointsLedger: [
          { id: 'p1', amount: 50, balanceAfter: 150, description: 'Quest reward', createdAt: new Date() },
        ],
        notifications: [
          { id: 'n1', type: 'STREAK_FREEZE', title: 'Streak Protected!', message: 'Your streak is safe', isRead: false, createdAt: new Date() },
        ],
        parentLinks: [{ childId: 'user-1', child: { displayName: 'Child Name' } }],
        childLinks: [{ parentId: 'parent-1', parent: { displayName: 'Parent Name' } }],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user-1');

      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('child@example.com');
      expect(result.user.coppaConsentVerified).toBe(true);
      expect(result).toHaveProperty('doterProfile');
      expect(result).toHaveProperty('goals');
      expect(result).toHaveProperty('quests');
      expect(result).toHaveProperty('pointsHistory');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('familyLinks');
      expect(result.familyLinks.asParent).toHaveLength(1);
      expect(result.familyLinks.asChild).toHaveLength(1);
    });

    it('should include doterProfile, goals, quests, points, notifications and family links', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'CHILD',
        createdAt: new Date(),
        updatedAt: new Date(),
        coppaConsentVerified: false,
        coppaConsentDate: null,
        gdprDeleteRequested: false,
        doterProfile: null,
        goals: [],
        quests: [],
        pointsLedger: [],
        notifications: [],
        parentLinks: [],
        childLinks: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user-2');

      expect(result.user.displayName).toBe('Test User');
      expect(result.doterProfile).toBeNull();
      expect(result.goals).toHaveLength(0);
      expect(result.quests).toHaveLength(0);
      expect(result.pointsHistory).toHaveLength(0);
      expect(result.notifications).toHaveLength(0);
      expect(result.familyLinks.asParent).toHaveLength(0);
      expect(result.familyLinks.asChild).toHaveLength(0);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('requestDeletion', () => {
    it('should schedule deletion 30 days in future', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', gdprDeleteRequested: false });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.requestDeletion('user-1');

      expect(result).toHaveProperty('deletionId', 'user-1');
      expect(result).toHaveProperty('scheduledDate');
      const scheduled = new Date(result.scheduledDate);
      const now = new Date();
      expect(scheduled.getTime() - now.getTime()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'GDPR_DELETE_REQUESTED',
        }),
      });
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.requestDeletion('nonexistent')).rejects.toThrow('User not found');
    });

    it('should throw if deletion already requested', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', gdprDeleteRequested: true });

      await expect(service.requestDeletion('user-1')).rejects.toThrow('Deletion already requested');
    });
  });

  describe('cancelDeletionRequest', () => {
    it('should cancel a pending deletion request', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', gdprDeleteRequested: true });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.cancelDeletionRequest('user-1');

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gdprDeleteRequested: false },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'GDPR_DELETE_CANCELLED',
        }),
      });
    });

    it('should throw if no deletion request exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', gdprDeleteRequested: false });

      await expect(service.cancelDeletionRequest('user-1')).rejects.toThrow('No deletion request found');
    });
  });

  describe('recordConsent', () => {
    it('should record GDPR consent audit log', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.recordConsent('user-1', 'coppa', true);

      expect(result).toBe(true);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'GDPR_CONSENT',
          payload: expect.stringContaining('coppa'),
        }),
      });
    });
  });

  describe('getConsentStatus', () => {
    it('should return consent status with audit history', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        coppaConsentVerified: true,
        coppaConsentDate: new Date('2025-01-01'),
        gdprDeleteRequested: false,
      });
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { payload: JSON.stringify({ consentType: 'coppa', granted: true, recordedAt: '2025-01-01T00:00:00Z' }) },
      ]);

      const result = await service.getConsentStatus('user-1');

      expect(result.coppaConsent.verified).toBe(true);
      expect(result.coppaConsent.date).toBeDefined();
      expect(result.gdprDeleteRequested).toBe(false);
      expect(result.consentHistory).toHaveLength(1);
    });
  });
});
