import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  async recordEvent(userId: string, event: string, metadata: Record<string, any> = {}) {
    return this.prisma.analyticsEvent.create({
      data: { userId, event, metadata },
    });
  }

  async getDAU(days: number) {
    const result: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const count = await this.prisma.user.count({
        where: { lastSeenAt: { gte: start, lt: end } },
      });
      result.push({ date: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  async getWAU(weeks: number) {
    const result: { week: string; count: number }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const count = await this.prisma.user.count({
        where: { lastSeenAt: { gte: start, lte: end } },
      });
      result.push({ week: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  async getMAU(months: number) {
    const result: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const count = await this.prisma.user.count({
        where: { lastSeenAt: { gte: start, lte: end } },
      });
      result.push({ month: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  @Cron('*/5 * * * *')
  async trackActiveUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const count = await this.prisma.user.count({
      where: { lastSeenAt: { gte: fiveMinutesAgo } },
    });
    this.metrics.activeUsers.set({ role: 'all' }, count);
  }

  async getOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthAgo = new Date(todayStart);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dau, wau, mau, totalUsers, signupsToday, onboardingCompleted, totalOnboarding] = await Promise.all([
      this.prisma.user.count({ where: { lastSeenAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: monthAgo } } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
      this.prisma.onboardingStatus.count(),
    ]);

    const onboardingCompletionRate = totalOnboarding > 0 ? onboardingCompleted / totalOnboarding : 0;

    const churned = await this.prisma.user.count({
      where: { lastSeenAt: { lt: thirtyDaysAgo }, createdAt: { lt: thirtyDaysAgo } },
    });
    const churnRate = totalUsers > 0 ? churned / totalUsers : 0;

    return { dau, wau, mau, totalUsers, signupsToday, onboardingCompletionRate, churnRate };
  }

  async getSignupConversion(startDate: Date, endDate: Date) {
    const totalUsers = await this.prisma.user.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    const onboardingRecords = await this.prisma.onboardingStatus.findMany({
      where: { user: { createdAt: { gte: startDate, lte: endDate } } },
    });

    const profileComplete = onboardingRecords.filter(o => o.profileComplete).length;
    const firstQuestDone = onboardingRecords.filter(o => o.firstQuestDone).length;

    return [
      { label: 'Signed Up', count: totalUsers, conversionRate: 1 },
      { label: 'Onboarding Started', count: onboardingRecords.length, conversionRate: totalUsers > 0 ? onboardingRecords.length / totalUsers : 0 },
      { label: 'Profile Complete', count: profileComplete, conversionRate: totalUsers > 0 ? profileComplete / totalUsers : 0 },
      { label: 'First Quest Done', count: firstQuestDone, conversionRate: totalUsers > 0 ? firstQuestDone / totalUsers : 0 },
    ];
  }

  async getOnboardingCompletion() {
    const [total, completed] = await Promise.all([
      this.prisma.onboardingStatus.count(),
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
    ]);
    return { total, completed, rate: total > 0 ? completed / total : 0 };
  }

  async getFeatureUsage(feature: string, days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await this.prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        event: { contains: feature, mode: 'insensitive' },
        createdAt: { gte: cutoff },
      },
      _count: { id: true },
    });

    return rows.map(r => ({ event: r.event, usageCount: r._count.id }));
  }

  async getFeatureUsageDaily(feature: string, days: number) {
    const result: { date: string; count: number }[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const count = await this.prisma.analyticsEvent.count({
        where: {
          event: { contains: feature, mode: 'insensitive' },
          createdAt: { gte: start, lt: end },
        },
      });
      result.push({ date: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  async getRetention(days: number = 30) {
    const retentionDays = [1, 3, 7, 14, 30];
    const maxDay = Math.max(...retentionDays.filter(d => d <= days));
    if (maxDay <= 0) return { day1: 0, day3: 0, day7: 0, day14: 0, day30: 0 };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDay);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { lte: cutoff } },
      select: { id: true, createdAt: true },
    });

    const userIds = users.map(u => u.id);

    const userActiveDates = new Map<string, Set<string>>();

    const events = await this.prisma.analyticsEvent.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: cutoff } },
      select: { userId: true, createdAt: true },
    });

    for (const evt of events) {
      const key = evt.createdAt.toISOString().split('T')[0];
      if (!userActiveDates.has(evt.userId)) userActiveDates.set(evt.userId, new Set());
      userActiveDates.get(evt.userId)!.add(key);
    }

    const result: Record<string, number> = {};
    for (const day of retentionDays) {
      if (day > days) { result['day' + day] = 0; continue; }
      let retained = 0;
      for (const user of users) {
        const target = new Date(user.createdAt);
        target.setDate(target.getDate() + day);
        const targetKey = target.toISOString().split('T')[0];
        if (userActiveDates.get(user.id)?.has(targetKey)) retained++;
      }
      result['day' + day] = users.length > 0 ? retained / users.length : 0;
    }
    return result;
  }

  async getChurnIndicators(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: {
        lastSeenAt: { lt: cutoff },
        createdAt: { lt: cutoff },
      },
      select: { id: true, displayName: true, email: true, lastSeenAt: true, createdAt: true },
      orderBy: { lastSeenAt: 'asc' },
    });

    return users;
  }

  async getChurnRate() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, churned] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      this.prisma.user.count({
        where: { createdAt: { lt: thirtyDaysAgo }, lastSeenAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    return total > 0 ? churned / total : 0;
  }

  async getBillingConversion() {
    const total = await this.prisma.user.count();
    let paid = 0;
    try {
      paid = await this.prisma.analyticsEvent.groupBy({
        by: ['userId'],
        where: { event: 'billing_subscription_created' },
        _count: { id: true },
      }).then(r => r.length);
    } catch {
      paid = 0;
    }
    return { total, paid, rate: total > 0 ? paid / total : 0 };
  }

  async getActivationMetrics() {
    const total = await this.prisma.user.count();

    const [onboardingCompleted, doterNamed, questCreatedGroups, questCompleted] = await Promise.all([
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
      this.prisma.doterProfile.count({ where: { NOT: { name: 'My Doter' } } }),
      this.prisma.quest.groupBy({ by: ['userId'] }),
      this.prisma.quest.count({ where: { status: 'APPROVED' } }),
    ]);

    const questCreated = questCreatedGroups.length;

    return {
      totalUsers: total,
      onboardingCompleted: { count: onboardingCompleted, rate: total > 0 ? onboardingCompleted / total : 0 },
      doterNamed: { count: doterNamed, rate: total > 0 ? doterNamed / total : 0 },
      questsCreated: { count: questCreated, rate: total > 0 ? questCreated / total : 0 },
      questsCompleted: { count: questCompleted, rate: total > 0 ? questCompleted / total : 0 },
    };
  }
}
