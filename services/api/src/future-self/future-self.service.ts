import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SimulationInput {
  userId: string;
  overrides?: {
    sleep_hours?: number;
    study_hours_weekly?: number;
    exercise_minutes_daily?: number;
    screen_hours_daily?: number;
  };
}

export interface SimulationResult {
  baseline: { career_readiness: number; health_projection: number; social_score: number };
  modified: { career_readiness: number; health_projection: number; social_score: number };
  narrative: string;
  disclaimer: string;
  avatar_params: { posture: number; energy: number; attire_level: number };
}

@Injectable()
export class FutureSelfService {
  private readonly logger = new Logger(FutureSelfService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private eventEmitter: EventEmitter2,
  ) {}

  async runSimulation(input: SimulationInput): Promise<SimulationResult> {
    const uup = await this.uupSync.getUUP(input.userId);

    const baseline = this.calculateBaseline(uup);
    const modified = this.calculateModified(uup, input.overrides);
    const narrative = this.generateNarrative(baseline, modified);
    const avatarParams = this.calculateAvatar(modified);

    this.eventEmitter.emit('simulation:completed', { userId: input.userId, result: modified });

    return {
      baseline,
      modified,
      narrative,
      disclaimer: 'This is a probabilistic projection based on current patterns. It is not a guarantee.',
      avatar_params: avatarParams,
    };
  }

  private calculateBaseline(uup: any): { career_readiness: number; health_projection: number; social_score: number } {
    const academicScore = (uup.academic?.math_rit || 200) / 300;
    const sleepScore = (uup.biometric?.avg_sleep_hours || 7) / 10;
    const activityScore = (uup.gamification?.active_streaks || 0) / 10;

    return {
      career_readiness: Math.min(1, academicScore * 0.6 + activityScore * 0.4),
      health_projection: Math.min(1, sleepScore * 0.8 + activityScore * 0.2),
      social_score: Math.min(1, (uup.social?.sbt_count || 0) / 10),
    };
  }

  private calculateModified(uup: any, overrides?: any): { career_readiness: number; health_projection: number; social_score: number } {
    const base = this.calculateBaseline(uup);

    if (overrides?.sleep_hours) {
      base.health_projection = Math.min(1, (overrides.sleep_hours / 10) * 0.8 + (uup.gamification?.active_streaks || 0) / 10 * 0.2);
    }
    if (overrides?.study_hours_weekly) {
      base.career_readiness = Math.min(1, base.career_readiness + (overrides.study_hours_weekly / 40) * 0.2);
    }
    if (overrides?.exercise_minutes_daily) {
      base.health_projection = Math.min(1, base.health_projection + (overrides.exercise_minutes_daily / 60) * 0.15);
    }

    return base;
  }

  private generateNarrative(baseline: any, modified: any): string {
    const delta = (modified.career_readiness - baseline.career_readiness) * 100;

    if (delta > 10) {
      return `With these changes, you're on track for significant growth! Your career readiness could improve by ${delta.toFixed(0)}% based on your adjusted habits.`;
    } else if (delta > 0) {
      return `Small adjustments can lead to meaningful progress. Your trajectory shows a ${delta.toFixed(0)}% improvement in career readiness.`;
    }
    return `Your current patterns show steady progress. Maintaining your habits will keep you on a positive trajectory.`;
  }

  private calculateAvatar(scores: any): { posture: number; energy: number; attire_level: number } {
    return {
      posture: 0.5 + (scores.health_projection || 0.5) * 0.5,
      energy: 0.3 + (scores.health_projection || 0.5) * 0.7,
      attire_level: Math.floor((scores.career_readiness || 0.5) * 5) + 1,
    };
  }
}