import { Test, TestingModule } from '@nestjs/testing';
import { AcademicService } from './academic.service';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { QuestPillar } from '../shared/prisma-enums';

describe('AcademicService', () => {
  let service: AcademicService;

  const mockPrisma = {
    skillGap: { upsert: jest.fn(), findMany: jest.fn() },
    tutoringSession: { create: jest.fn(), findMany: jest.fn() },
  };

  const mockUupSync = {
    getUUP: jest.fn(),
    sync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UUPSyncService, useValue: mockUupSync },
      ],
    }).compile();

    service = module.get<AcademicService>(AcademicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSkillGap', () => {
    const userId = 'user-1';
    const subject = 'math';
    const pillar = QuestPillar.ACADEMIC;
    const gapScore = 0.75;

    it('should upsert a skill gap and sync to UUP', async () => {
      const upserted = { id: 'gap-1', userId, subject, pillar, gapScore, lastPracticed: new Date() };
      const allGaps = [
        upserted,
        { id: 'gap-2', userId, subject: 'reading', pillar, gapScore: 0.3, lastPracticed: new Date() },
      ];

      mockPrisma.skillGap.upsert.mockResolvedValue(upserted);
      mockPrisma.skillGap.findMany.mockResolvedValue(allGaps);
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.updateSkillGap(userId, subject, pillar, gapScore);

      expect(result).toEqual(upserted);
      expect(mockPrisma.skillGap.upsert).toHaveBeenCalledWith({
        where: { userId_subject: { userId, subject } },
        create: { userId, subject, pillar, gapScore, lastPracticed: expect.any(Date) },
        update: { gapScore, lastPracticed: expect.any(Date) },
      });
      expect(mockUupSync.sync).toHaveBeenCalledWith({
        source: 'academic',
        userId,
        data: { academic: { skill_gaps: { math: 0.75, reading: 0.3 } } },
        actorId: userId,
        actorRole: 'ADMIN',
      });
    });

    it('should handle empty skill gaps gracefully', async () => {
      const upserted = { id: 'gap-1', userId, subject, pillar, gapScore, lastPracticed: new Date() };
      mockPrisma.skillGap.upsert.mockResolvedValue(upserted);
      mockPrisma.skillGap.findMany.mockResolvedValue([]);
      mockUupSync.sync.mockResolvedValue({ success: true, mergedFields: [], triggeredEvents: [] });

      const result = await service.updateSkillGap(userId, subject, pillar, gapScore);

      expect(result).toEqual(upserted);
      expect(mockUupSync.sync).toHaveBeenCalledWith(
        expect.objectContaining({ data: { academic: { skill_gaps: {} } } }),
      );
    });

    it('should propagate prisma upsert errors', async () => {
      mockPrisma.skillGap.upsert.mockRejectedValue(new Error('DB error'));

      await expect(service.updateSkillGap(userId, subject, pillar, gapScore)).rejects.toThrow('DB error');
    });
  });

  describe('getSkillGaps', () => {
    it('should return skill gaps ordered by gapScore ascending', async () => {
      const gaps = [
        { id: 'gap-1', userId: 'user-1', subject: 'reading', gapScore: 0.3 },
        { id: 'gap-2', userId: 'user-1', subject: 'math', gapScore: 0.75 },
      ];
      mockPrisma.skillGap.findMany.mockResolvedValue(gaps);

      const result = await service.getSkillGaps('user-1');

      expect(result).toEqual(gaps);
      expect(mockPrisma.skillGap.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { gapScore: 'asc' },
      });
    });

    it('should return empty array when no gaps exist', async () => {
      mockPrisma.skillGap.findMany.mockResolvedValue([]);

      const result = await service.getSkillGaps('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('startTutoringSession', () => {
    it('should create a tutoring session without assignmentId', async () => {
      const session = { id: 'session-1', userId: 'user-1', subject: 'math', assignmentId: null };
      mockPrisma.tutoringSession.create.mockResolvedValue(session);

      const result = await service.startTutoringSession('user-1', 'math');

      expect(result).toEqual(session);
      expect(mockPrisma.tutoringSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', subject: 'math', assignmentId: undefined },
      });
    });

    it('should create a tutoring session with assignmentId', async () => {
      const session = { id: 'session-1', userId: 'user-1', subject: 'math', assignmentId: 'assign-1' };
      mockPrisma.tutoringSession.create.mockResolvedValue(session);

      const result = await service.startTutoringSession('user-1', 'math', 'assign-1');

      expect(result).toEqual(session);
      expect(mockPrisma.tutoringSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', subject: 'math', assignmentId: 'assign-1' },
      });
    });

    it('should propagate prisma create errors', async () => {
      mockPrisma.tutoringSession.create.mockRejectedValue(new Error('Create failed'));

      await expect(service.startTutoringSession('user-1', 'math')).rejects.toThrow('Create failed');
    });
  });

  describe('getTutoringSessions', () => {
    it('should return recent tutoring sessions ordered by createdAt desc', async () => {
      const sessions = [
        { id: 's2', userId: 'user-1', subject: 'reading', createdAt: new Date('2025-01-02') },
        { id: 's1', userId: 'user-1', subject: 'math', createdAt: new Date('2025-01-01') },
      ];
      mockPrisma.tutoringSession.findMany.mockResolvedValue(sessions);

      const result = await service.getTutoringSessions('user-1');

      expect(result).toEqual(sessions);
      expect(mockPrisma.tutoringSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should return empty array when no sessions exist', async () => {
      mockPrisma.tutoringSession.findMany.mockResolvedValue([]);

      const result = await service.getTutoringSessions('user-1');

      expect(result).toEqual([]);
    });
  });
});
