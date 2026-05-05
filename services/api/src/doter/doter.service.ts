import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  constructor(private prisma: PrismaService) {}

  async getDoter(userId: string) {
    return this.prisma.doterProfile.findUnique({ where: { userId } });
  }

  async addXP(userId: string, xp: number): Promise<{ doter: any; evolved: boolean; newState?: DoterState }> {
    const doter = await this.prisma.doterProfile.findUnique({ where: { userId } });
    if (!doter) throw new Error('Doter not found');

    const newXp = doter.xp + xp;
    const newLevel = Math.floor(newXp / 1000) + 1;

    // Check evolution with Milestone Gates
    const states = Object.keys(EVOLUTION_THRESHOLDS) as DoterState[];
    let targetState = doter.state as unknown as DoterState;
    
    // Fetch quest stats for gates
    const questCount = await this.prisma.quest.count({ where: { userId, status: 'APPROVED' } });
    const academicQuestCount = await this.prisma.quest.count({ 
      where: { userId, status: 'APPROVED', pillar: 'ACADEMIC' } 
    });

    for (const state of states) {
      const thresholdMet = newXp >= EVOLUTION_THRESHOLDS[state];
      let gateMet = true;

      // Evolution Gates (Milestone Logic)
      if (state === DoterState.JUVENILE && academicQuestCount < 5) gateMet = false;
      if (state === DoterState.ADOLESCENT && questCount < 15) gateMet = false;
      if (state === DoterState.ADULT && questCount < 40) gateMet = false;

      if (thresholdMet && gateMet) {
        targetState = state as DoterState;
      }
    }

    const evolved = targetState !== doter.state;

    const evolutionHistory = (doter.evolutionHistory as any[]) || [];
    if (evolved) {
      evolutionHistory.push({ from: doter.state, to: targetState, at: new Date().toISOString(), xpAtEvolution: newXp });
      this.logger.log(`🐣 Doter EVOLVED: ${doter.state} → ${targetState} for user ${userId}`);

      // Create celebration notification
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'DOTER_EVOLVED',
          title: '🎉 Your Doter Evolved!',
          body: `Your Doter became a ${targetState.toLowerCase()}! Your hard work is paying off!`,
          data: { from: doter.state, to: targetState },
        },
      });
    }

    const updated = await this.prisma.doterProfile.update({
      where: { userId },
      data: { xp: newXp, level: newLevel, state: targetState, evolutionHistory },
    });

    return { doter: updated, evolved, newState: evolved ? targetState : undefined };
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
}
