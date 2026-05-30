import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    notification: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUnread', () => {
    it('should return unread notifications ordered by createdAt desc', async () => {
      const notifications = [
        { id: 'n1', userId: 'user-1', isRead: false, createdAt: new Date('2026-06-02T10:00:00Z') },
        { id: 'n2', userId: 'user-1', isRead: false, createdAt: new Date('2026-06-01T10:00:00Z') },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);

      const result = await service.getUnread('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      );
    });

    it('should return empty array when no unread notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const result = await service.getUnread('user-1');

      expect(result).toEqual([]);
    });

    it('should limit results to 20 notifications', async () => {
      const manyNotifications = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, isRead: false }));
      mockPrisma.notification.findMany.mockResolvedValue(manyNotifications.slice(0, 20));

      const result = await service.getUnread('user-1');

      expect(result).toHaveLength(20);
    });
  });

  describe('markRead', () => {
    it('should mark a single notification as read', async () => {
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true, readAt: expect.any(Date) });

      const result = await service.markRead('n1');

      expect(result.isRead).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n1' },
          data: expect.objectContaining({ isRead: true, readAt: expect.any(Date) }),
        }),
      );
    });

    it('should set readAt to current date', async () => {
      const before = new Date();
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true, readAt: new Date() });

      await service.markRead('n1');
      const after = new Date();

      const callArg = mockPrisma.notification.update.mock.calls[0][0];
      expect(callArg.data.readAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(callArg.data.readAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw when notification does not exist', async () => {
      mockPrisma.notification.update.mockRejectedValue(new Error('Record not found'));

      await expect(service.markRead('nonexistent')).rejects.toThrow('Record not found');
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read for the user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllRead('user-1');

      expect(result.count).toBe(3);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
          data: expect.objectContaining({ isRead: true, readAt: expect.any(Date) }),
        }),
      );
    });

    it('should return count 0 when no unread notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllRead('user-1');

      expect(result.count).toBe(0);
    });

    it('should set readAt on all updated notifications', async () => {
      const before = new Date();
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAllRead('user-1');
      const after = new Date();

      const callArg = mockPrisma.notification.updateMany.mock.calls[0][0];
      expect(callArg.data.readAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(callArg.data.readAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
