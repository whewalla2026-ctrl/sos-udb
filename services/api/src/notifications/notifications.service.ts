import { Injectable } from '@nestjs/common'; import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}
  async getUnread(userId: string) { return this.prisma.notification.findMany({ where: { userId, isRead: false }, orderBy: { createdAt: 'desc' }, take: 20 }); }
  async markRead(notificationId: string) { return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true, readAt: new Date() } }); }
  async markAllRead(userId: string) { return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } }); }
}
