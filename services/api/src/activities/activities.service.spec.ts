import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestPillar } from '../shared/prisma-enums';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    activity: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createActivity', () => {
    it('should create an activity and return conflict info', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', title: 'Test', userId: 'user-1' });

      const result = await service.createActivity('user-1', {
        title: 'Test',
        startTime: new Date('2026-06-01T10:00:00Z'),
        endTime: new Date('2026-06-01T11:00:00Z'),
      });

      expect(result.activity.id).toBe('act-1');
      expect(result.conflict.hasConflict).toBe(false);
      expect(mockPrisma.activity.create).toHaveBeenCalledTimes(1);
    });

    it('should warn but still create when a conflict is detected', async () => {
      const conflicting = { id: 'conflict-1', title: 'Existing', startTime: new Date('2026-06-01T09:00:00Z'), endTime: new Date('2026-06-01T11:00:00Z') };
      mockPrisma.activity.findFirst.mockResolvedValue(conflicting);
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-2', title: 'New', userId: 'user-1' });

      const result = await service.createActivity('user-1', {
        title: 'New',
        startTime: new Date('2026-06-01T10:00:00Z'),
        endTime: new Date('2026-06-01T11:00:00Z'),
      });

      expect(result.conflict.hasConflict).toBe(true);
      expect(result.conflict.conflictingActivity).toEqual(conflicting);
      expect(result.conflict.suggestedTime).toBeDefined();
    });

    it('should set default values for optional fields', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-3', title: 'Deep Work', isDeepWork: false, metadata: {} });

      await service.createActivity('user-1', {
        title: 'Deep Work',
        startTime: new Date('2026-06-01T10:00:00Z'),
        endTime: new Date('2026-06-01T11:00:00Z'),
      });

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDeepWork: false,
            isRecurring: false,
            metadata: {},
          }),
        }),
      );
    });

    it('should set isRecurring when rrule is provided', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-4', title: 'Weekly', isRecurring: true });

      await service.createActivity('user-1', {
        title: 'Weekly',
        startTime: new Date('2026-06-01T10:00:00Z'),
        endTime: new Date('2026-06-01T11:00:00Z'),
        rrule: 'FREQ=WEEKLY;BYDAY=MO',
      });

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRecurring: true, rrule: 'FREQ=WEEKLY;BYDAY=MO' }),
        }),
      );
    });
  });

  describe('detectConflict', () => {
    it('should return hasConflict false when no overlapping activity', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      const result = await service.detectConflict('user-1', new Date('2026-06-01T10:00:00Z'), new Date('2026-06-01T11:00:00Z'));

      expect(result.hasConflict).toBe(false);
    });

    it('should return hasConflict true with suggested time when overlap found', async () => {
      const overlapping = { id: 'act-1', title: 'Meeting', startTime: new Date('2026-06-01T09:00:00Z'), endTime: new Date('2026-06-01T10:30:00Z') };
      mockPrisma.activity.findFirst.mockResolvedValue(overlapping);

      const result = await service.detectConflict('user-1', new Date('2026-06-01T10:00:00Z'), new Date('2026-06-01T11:00:00Z'));

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingActivity).toEqual(overlapping);
      expect(result.suggestedTime).toBeDefined();
      expect(result.reasoning).toContain('Meeting');
    });

    it('should exclude the given activity id when excludeId is provided', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await service.detectConflict('user-1', new Date('2026-06-01T10:00:00Z'), new Date('2026-06-01T11:00:00Z'), 'exclude-me');

      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'exclude-me' } }),
        }),
      );
    });

    it('should handle prisma error gracefully', async () => {
      mockPrisma.activity.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(service.detectConflict('user-1', new Date(), new Date())).rejects.toThrow('DB error');
    });
  });

  describe('updateActivity', () => {
    it('should update activity and increment version', async () => {
      const existing = { id: 'act-1', title: 'Old', version: 1, versionHistory: [] };
      mockPrisma.activity.findUnique.mockResolvedValue(existing);
      mockPrisma.activity.update.mockResolvedValue({ id: 'act-1', title: 'Updated', version: 2 });

      const result = await service.updateActivity('act-1', 'user-1', { title: 'Updated' });

      expect(result.version).toBe(2);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Updated', version: 2 }),
        }),
      );
    });

    it('should throw if activity not found', async () => {
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(service.updateActivity('nonexistent', 'user-1', { title: 'Nope' })).rejects.toThrow('Activity not found');
    });

    it('should preserve existing version history', async () => {
      const existing = { id: 'act-1', title: 'Old', version: 2, versionHistory: [{ version: 1, snapshot: {}, changedAt: '2026-01-01' }] };
      mockPrisma.activity.findUnique.mockResolvedValue(existing);
      mockPrisma.activity.update.mockResolvedValue({ id: 'act-1', title: 'New', version: 3 });

      await service.updateActivity('act-1', 'user-1', { title: 'New' });

      expect(mockPrisma.activity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionHistory: expect.arrayContaining([
              expect.objectContaining({ version: 2 }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getUserCalendar', () => {
    it('should return activities within date range sorted ascending', async () => {
      const activities = [
        { id: 'a1', startTime: new Date('2026-06-02T10:00:00Z'), endTime: new Date('2026-06-02T11:00:00Z'), isRecurring: false },
        { id: 'a2', startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T11:00:00Z'), isRecurring: false },
      ];
      mockPrisma.activity.findMany.mockResolvedValue(activities);

      const result = await service.getUserCalendar('user-1', new Date('2026-06-01T00:00:00Z'), new Date('2026-06-30T00:00:00Z'));

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a2');
      expect(result[1].id).toBe('a1');
    });

    it('should expand recurring events within the range', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { id: 'recur-1', startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T11:00:00Z'), isRecurring: true, rrule: 'FREQ=WEEKLY;BYDAY=MO', title: 'Weekly' },
      ]);

      const result = await service.getUserCalendar('user-1', new Date('2026-06-01T00:00:00Z'), new Date('2026-06-28T00:00:00Z'));

      expect(result.length).toBeGreaterThan(1);
    });

    it('should gracefully handle invalid rrule', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { id: 'bad-rrule', startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T11:00:00Z'), isRecurring: true, rrule: 'INVALID', title: 'Bad' },
      ]);

      const result = await service.getUserCalendar('user-1', new Date('2026-06-01T00:00:00Z'), new Date('2026-06-07T00:00:00Z'));

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no activities exist', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);

      const result = await service.getUserCalendar('user-1', new Date('2026-06-01T00:00:00Z'), new Date('2026-06-30T00:00:00Z'));

      expect(result).toEqual([]);
    });
  });

  describe('bulkImport', () => {
    it('should create multiple activities with skipDuplicates', async () => {
      mockPrisma.activity.createMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkImport('user-1', [
        { title: 'A', startTime: new Date(), endTime: new Date() },
        { title: 'B', startTime: new Date(), endTime: new Date() },
      ]);

      expect(result.count).toBe(2);
      expect(mockPrisma.activity.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ title: 'A', userId: 'user-1' }),
            expect.objectContaining({ title: 'B', userId: 'user-1' }),
          ]),
          skipDuplicates: true,
        }),
      );
    });

    it('should handle empty items array', async () => {
      mockPrisma.activity.createMany.mockResolvedValue({ count: 0 });

      const result = await service.bulkImport('user-1', []);

      expect(result.count).toBe(0);
    });

    it('should pass pillar when provided', async () => {
      mockPrisma.activity.createMany.mockResolvedValue({ count: 1 });

      await service.bulkImport('user-1', [
        { title: 'A', startTime: new Date(), endTime: new Date(), pillar: QuestPillar.ACADEMIC },
      ]);

      expect(mockPrisma.activity.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ pillar: QuestPillar.ACADEMIC }),
          ]),
        }),
      );
    });
  });
});
