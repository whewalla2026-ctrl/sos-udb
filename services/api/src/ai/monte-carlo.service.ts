import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonteCarloService {
  private readonly logger = new Logger(MonteCarloService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Run a Monte Carlo simulation for a child's future potential.
   * Scenarios include: Continued Habit Streak, Skill Gap Closure, Venture Success.
   */
  async runSimulation(userId: string, iterations = 1000) {
    this.logger.log(`🎲 Running Monte Carlo simulation for user ${userId} (${iterations} iterations)`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { doterProfile: true, skillGaps: true }
    });

    if (!user) throw new Error('User not found');

    const results = {
      pathways: {
        academicMastery: 0,
        financialIndependence: 0,
        wellnessScore: 0,
      },
      p50: {
        academic: 0,
        financial: 0,
        wellness: 0,
      },
      p90: {
        academic: 0,
        financial: 0,
        wellness: 0,
      },
    };

    // Simulated simulation logic
    const uup = (user.uupData as Record<string, any>) || {};
    const entrepreneurship = uup['entrepreneurship'] || {};
    const streakDays = user.doterProfile?.streakDays ?? 0;

    for (let i = 0; i < iterations; i++) {
      const randomFactor = Math.random();
      results.pathways.academicMastery += (user.skillGaps.length > 0 ? 0.8 : 0.4) * randomFactor;
      results.pathways.financialIndependence += ((entrepreneurship.totalRevenue || 0) > 100 ? 0.9 : 0.2) * randomFactor;
      results.pathways.wellnessScore += (streakDays > 10 ? 0.85 : 0.5) * randomFactor;
    }

    // Average outcomes
    results.p50 = {
      academic: (results.pathways.academicMastery / iterations) * 100,
      financial: (results.pathways.financialIndependence / iterations) * 100,
      wellness: (results.pathways.wellnessScore / iterations) * 100,
    };

    return results;
  }
}
