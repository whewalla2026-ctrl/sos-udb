import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { doterProfile: true },
    });
  }

  async updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string; timezone?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async updateAccessibility(userId: string, settings: Record<string, any>) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { accessibilitySettings: settings },
    });
  }

  async getChildren(parentId: string) {
    const links = await this.prisma.familyLink.findMany({
      where: { parentId },
      include: { child: { include: { doterProfile: true } } },
    });
    return links.map(l => l.child);
  }

  async getDashboardData(userId: string) {
    const [user, quests, goals, notifications, balance] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { doterProfile: true } }),
      this.prisma.quest.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }, take: 5 }),
      this.prisma.goal.findMany({ where: { userId, status: 'ACTIVE' }, take: 3 }),
      this.prisma.notification.findMany({ where: { userId, isRead: false }, take: 10, orderBy: { createdAt: 'desc' } }),
      this.prisma.pointsLedger.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return { user, activeQuests: quests, activeGoals: goals, unreadNotifications: notifications, coinBalance: balance?.balanceAfter ?? 0 };
  }
}
