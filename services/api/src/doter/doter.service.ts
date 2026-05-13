import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { DoterState } from '../shared/prisma-enums';

// XP thresholds for each Doter evolution stage
const EVOLUTION_THRESHOLDS: Record<DoterState, number> = {
  [DoterState.EGG]: 0,
  [DoterState.HATCHLING]: 500,
  [DoterState.JUVENILE]: 2000,
  [DoterState.ADOLESCENT]: 5000,
  [DoterState.ADULT]: 12000,
  [DoterState.LEGENDARY]: 30000,
};

@Injectable()
export class DoterService {
  private readonly logger = new Logger(DoterService.name);

  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  async getDoter(userId: string) {
    return this.prisma.doterProfile.findUnique({ where: { userId } });
  }

  async addXP(userId: string, xp: number): Promise<{ doter: any; evolved: boolean; newState?: DoterState; rewards?: any[] }> {
    const doter = await this.prisma.doterProfile.findUnique({ where: { userId } });
    if (!doter) throw new Error('Doter not found');

    const newXp = doter.xp + xp;
    const newLevel = Math.floor(newXp / 1000) + 1;

    const states = Object.keys(EVOLUTION_THRESHOLDS) as DoterState[];
    let newState = doter.state as unknown as DoterState;
    for (const state of states) {
      if (newXp >= EVOLUTION_THRESHOLDS[state]) newState = state as DoterState;
    }

    const evolved = newState !== doter.state;
    const evolutionHistory = (doter.evolutionHistory as any[]) || [];
    const rewards: any[] = [];

    if (evolved) {
      evolutionHistory.push({ from: doter.state, to: newState, at: new Date().toISOString(), xpAtEvolution: newXp });
      this.metrics.doterLevelUps.inc({ level: String(newState) });
      this.logger.log(`Doter EVOLVED: ${doter.state} -> ${newState} for user ${userId}`);

      await this.prisma.notification.create({
        data: {
          userId, type: 'DOTER_EVOLVED',
          title: 'Your Doter Evolved!',
          body: `Your Doter became a ${newState.toLowerCase()}! Keep going!`,
          data: { from: doter.state, to: newState },
        },
      });
    }

    const updated = await this.prisma.doterProfile.update({
      where: { userId },
      data: { xp: newXp, level: newLevel, state: newState, evolutionHistory },
    });

    const earnedRewards = await this.checkRewards(userId, newXp, newState as DoterState);
    rewards.push(...earnedRewards);

    return { doter: updated, evolved, newState: evolved ? newState : undefined, rewards: rewards.length > 0 ? rewards : undefined };
  }

  async checkRewards(userId: string, xp: number, state: DoterState): Promise<any[]> {
    const earned: any[] = [];
    const triggers = await this.prisma.evolutionTrigger.findMany({ where: { active: true } });

    for (const trigger of triggers) {
      const condition = trigger.condition as any;
      const effect = trigger.effect as any;
      const existing = await this.prisma.doterReward.findFirst({ where: { userId, triggerType: condition.type } });
      if (existing) continue;

      let met = false;
      if (condition.type === 'XP' && xp >= condition.threshold) met = true;
      if (condition.type === 'STREAK') {
        const doter = await this.prisma.doterProfile.findUnique({ where: { userId } });
        if (doter && doter.streakDays >= condition.threshold) met = true;
      }

      if (met && effect.badge) {
        const reward = await this.prisma.doterReward.create({
          data: {
            userId, type: 'BADGE', name: trigger.name, description: trigger.description,
            tier: condition.threshold > 10000 ? 'GOLD' : condition.threshold > 5000 ? 'SILVER' : 'BRONZE',
            triggerType: condition.type, triggerValue: condition.threshold,
          },
        });
        earned.push(reward);
      }
    }
    return earned;
  }

  async getRewards(userId: string) {
    return this.prisma.doterReward.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });
  }

  async getEvolutionTriggers() {
    return this.prisma.evolutionTrigger.findMany({ where: { active: true } });
  }

  async applyDebuff(userId: string, debuffType: string) {
    const doter = await this.prisma.doterProfile.findUnique({ where: { userId } });
    if (!doter) return;

    const debuffs = (doter.debuffs as string[]) || [];
    if (!debuffs.includes(debuffType)) {
      await this.prisma.doterProfile.update({
        where: { userId },
        data: { debuffs: [...debuffs, debuffType], isSluggy: debuffType === 'SLUGGISH_STATE' },
      });
    }
  }

  async removeDebuff(userId: string, debuffType: string) {
    const doter = await this.prisma.doterProfile.findUnique({ where: { userId } });
    if (!doter) return;
    const debuffs = ((doter.debuffs as string[]) || []).filter(d => d !== debuffType);
    await this.prisma.doterProfile.update({ where: { userId }, data: { debuffs } });
  }

  async nameDoter(userId: string, name: string) {
    return this.prisma.doterProfile.update({ where: { userId }, data: { name } });
  }

  async incrementStreak(userId: string) {
    const doter = await this.prisma.doterProfile.findUnique({ where: { userId } });
    if (!doter) return;
    const newStreak = doter.streakDays + 1;
    return this.prisma.doterProfile.update({
      where: { userId },
      data: { streakDays: newStreak },
    });
  }

  async getGamificationAnalytics(userId: string) {
    const [doter, rewards, streaks] = await Promise.all([
      this.prisma.doterProfile.findUnique({ where: { userId } }),
      this.prisma.doterReward.findMany({ where: { userId } }),
      this.prisma.streak.findMany({ where: { userId } }),
    ]);
    if (!doter) return null;
    const avgStreak = streaks.length > 0 ? streaks.reduce((s, st) => s + st.currentDays, 0) / streaks.length : 0;
    return {
      name: doter.name, state: doter.state, level: doter.level, xp: doter.xp,
      streakDays: doter.streakDays, avgStreakDays: Math.round(avgStreak),
      totalRewards: rewards.length, isEnergetic: doter.isEnergetic, isSluggy: doter.isSluggy,
    };
  }
}
