import { Resolver, Query, Mutation, Args, ID, ObjectType, Field, Int } from '@nestjs/graphql';
import { GamificationService, DoterState } from './gamification.service';

@ObjectType()
export class DoterStatus {
  @Field(() => Int)
  level: number;

  @Field(() => String)
  state: DoterState;

  @Field(() => Int)
  coinBalance: number;

  @Field(() => Int)
  xp: number;

  @Field(() => Int)
  activeStreaks: number;

  @Field(() => Int)
  streakFreezeAvailable: number;
}

@ObjectType()
export class PointsLedgerItem {
  @Field(() => String)
  id: string;

  @Field(() => Int)
  amount: number;

  @Field(() => String)
  type: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  reference?: string;

  @Field(() => String)
  createdAt: string;
}

@ObjectType()
export class PointsBalance {
  @Field(() => Int)
  balance: number;
}

@Resolver(() => DoterStatus)
export class GamificationResolver {
  constructor(private gamificationService: GamificationService) {}

  @Query(() => DoterStatus)
  async doterStatus(@Args('userId', { type: () => ID }) userId: string) {
    const uup = await this.uupSync?.getUUP(userId);
    return {
      level: uup?.gamification?.doter_level || 1,
      state: uup?.gamification?.doter_state || 'NEUTRAL',
      coinBalance: uup?.gamification?.coin_balance || 0,
      xp: uup?.gamification?.xp || 0,
      activeStreaks: uup?.gamification?.active_streaks || 0,
      streakFreezeAvailable: uup?.gamification?.streak_freeze_available || 0,
    };
  }

  @Query(() => Int)
  async pointsBalance(@Args('userId', { type: () => ID }) userId: string) {
    return this.gamificationService.getPointsBalance(userId);
  }

  @Query(() => [PointsLedgerItem])
  async pointsLedger(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    const transactions = await this.gamificationService.getPointsLedger(userId, limit, offset);
    return transactions.map((t: any) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      status: t.status,
      reference: t.reference,
      createdAt: new Date().toISOString(),
    }));
  }

  @Mutation(() => Boolean)
  async activateStreakFreeze(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('reason', { defaultValue: 'manual' }) reason: 'manual' | 'auto',
  ) {
    return this.gamificationService.activateStreakFreeze(userId, reason);
  }

  @Mutation(() => Boolean)
  async deactivateStreakFreeze(@Args('userId', { type: () => ID }) userId: string) {
    return this.gamificationService.deactivateStreakFreeze(userId);
  }
}

import { UUPSyncService } from '../uup-sync/uup-sync.service';

GamificationResolver.prototype.uupSync = null;
GamificationResolver = Object.assign(GamificationResolver, { uupSync: null });
