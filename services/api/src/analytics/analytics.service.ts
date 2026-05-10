import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async recordEvent(userId: string, event: string, metadata: Record<string, any> = {}) {
    return this.prisma.analyticsEvent.create({
      data: { userId, event, metadata },
    });
  }

  async getDAU(days: number) {
    var result: { date: string; count: number }[] = [];
    for (var i = days - 1; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var end = new Date(start);
      end.setDate(end.getDate() + 1);
      var count = await this.prisma.user.count({
        where: { lastSeenAt: { gte: start, lt: end } },
      });
      result.push({ date: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  async getWAU(weeks: number) {
    var result: { week: string; count: number }[] = [];
    for (var i = weeks - 1; i >= 0; i--) {
      var end = new Date();
      end.setDate(end.getDate() - i * 7);
      var start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      var count = await this.prisma.user.count({
        where: { lastSeenAt: { gte: start, lte: end } },
      });
      result.push({ week: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  async getMAU(months: number) {
    var result: { month: string; count: number }[] = [];
    for (var i = months - 1; i >= 0; i--) {
      var date = new Date();
      date.setMonth(date.getMonth() - i);
      var start = new Date(date.getFullYear(), date.getMonth(), 1);
      var end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      var count = await this.prisma.user.count({
        where: { lastSeenAt: { gte: start, lte: end } },
      });
      result.push({ month: start.toISOString().split('T')[0], count });
    }
    return result;
  }

  async getOverview() {
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);
    var monthAgo = new Date(todayStart);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    var thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    var [dau, wau, mau, totalUsers, signupsToday, onboardingCompleted, totalOnboarding] = await Promise.all([
      this.prisma.user.count({ where: { lastSeenAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: monthAgo } } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
      this.prisma.onboardingStatus.count(),
    ]);

    var onboardingCompletionRate = totalOnboarding > 0 ? onboardingCompleted / totalOnboarding : 0;

    var churned = await this.prisma.user.count({
      where: { lastSeenAt: { lt: thirtyDaysAgo }, createdAt: { lt: thirtyDaysAgo } },
    });
    var churnRate = totalUsers > 0 ? churned / totalUsers : 0;

    return { dau, wau, mau, totalUsers, signupsToday, onboardingCompletionRate, churnRate };
  }

  async getSignupConversion(startDate: Date, endDate: Date) {
    var totalUsers = await this.prisma.user.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    var onboardingRecords = await this.prisma.onboardingStatus.findMany({
      where: { user: { createdAt: { gte: startDate, lte: endDate } } },
    });

    var profileComplete = onboardingRecords.filter(o => o.profileComplete).length;
    var firstQuestDone = onboardingRecords.filter(o => o.firstQuestDone).length;

    return [
      { label: 'Signed Up', count: totalUsers, conversionRate: 1 },
      { label: 'Onboarding Started', count: onboardingRecords.length, conversionRate: totalUsers > 0 ? onboardingRecords.length / totalUsers : 0 },
      { label: 'Profile Complete', count: profileComplete, conversionRate: totalUsers > 0 ? profileComplete / totalUsers : 0 },
      { label: 'First Quest Done', count: firstQuestDone, conversionRate: totalUsers > 0 ? firstQuestDone / totalUsers : 0 },
    ];
  }

  async getOnboardingCompletion() {
    var [total, completed] = await Promise.all([
      this.prisma.onboardingStatus.count(),
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
    ]);
    return { total, completed, rate: total > 0 ? completed / total : 0 };
  }

  async getFeatureUsage(feature: string, days: number) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    var rows = await this.prisma.analyticsEvent.groupBy({
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
    var result: { date: string; count: number }[] = [];
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (var i = days - 1; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var end = new Date(start);
      end.setDate(end.getDate() + 1);

      var count = await this.prisma.analyticsEvent.count({
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
    var retentionDays = [1, 3, 7, 14, 30];
    var maxDay = Math.max(...retentionDays.filter(d => d <= days));
    if (maxDay <= 0) return { day1: 0, day3: 0, day7: 0, day14: 0, day30: 0 };

    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDay);

    var users = await this.prisma.user.findMany({
      where: { createdAt: { lte: cutoff } },
      select: { id: true, createdAt: true },
    });

    var userIds = users.map(u => u.id);

    var userActiveDates = new Map<string, Set<string>>();

    var events = await this.prisma.analyticsEvent.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: cutoff } },
      select: { userId: true, createdAt: true },
    });

    for (var evt of events) {
      var key = evt.createdAt.toISOString().split('T')[0];
      if (!userActiveDates.has(evt.userId)) userActiveDates.set(evt.userId, new Set());
      userActiveDates.get(evt.userId)!.add(key);
    }

    var result: Record<string, number> = {};
    for (var day of retentionDays) {
      if (day > days) { result['day' + day] = 0; continue; }
      var retained = 0;
      for (var user of users) {
        var target = new Date(user.createdAt);
        target.setDate(target.getDate() + day);
        var targetKey = target.toISOString().split('T')[0];
        if (userActiveDates.get(user.id)?.has(targetKey)) retained++;
      }
      result['day' + day] = users.length > 0 ? retained / users.length : 0;
    }
    return result;
  }

  async getChurnIndicators(days: number = 30) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    var users = await this.prisma.user.findMany({
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
    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    var [total, churned] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      this.prisma.user.count({
        where: { createdAt: { lt: thirtyDaysAgo }, lastSeenAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    return total > 0 ? churned / total : 0;
  }

  async getBillingConversion() {
    var total = await this.prisma.user.count();
    var paid = 0;
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
    var total = await this.prisma.user.count();

    var [onboardingCompleted, doterNamed, questCreatedGroups, questCompleted] = await Promise.all([
      this.prisma.onboardingStatus.count({ where: { completed: true } }),
      this.prisma.doterProfile.count({ where: { NOT: { name: 'My Doter' } } }),
      this.prisma.quest.groupBy({ by: ['userId'] }),
      this.prisma.quest.count({ where: { status: 'APPROVED' } }),
    ]);

    var questCreated = questCreatedGroups.length;

    return {
      totalUsers: total,
      onboardingCompleted: { count: onboardingCompleted, rate: total > 0 ? onboardingCompleted / total : 0 },
      doterNamed: { count: doterNamed, rate: total > 0 ? doterNamed / total : 0 },
      questsCreated: { count: questCreated, rate: total > 0 ? questCreated / total : 0 },
      questsCompleted: { count: questCompleted, rate: total > 0 ? questCompleted / total : 0 },
    };
  }
}
