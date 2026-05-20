import { Resolver, Query, Mutation, Args, InputType, Field, Int, ObjectType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BiometricService, BiometricEntry } from './biometric.service';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
class BiometricSyncInput {
  @Field(() => Int, { nullable: true }) sleepHours?: number;
  @Field(() => Int, { nullable: true }) hrv?: number;
  @Field(() => Int, { nullable: true }) stressIndex?: number;
  @Field(() => Int, { nullable: true }) restingHr?: number;
  @Field(() => Int, { nullable: true }) steps?: number;
  @Field({ nullable: true }) source?: 'healthkit' | 'googlefit' | 'manual';
}

@ObjectType()
class BiometricSyncResult {
  @Field() ingested: number;
  @Field() duplicates: number;
  @Field(() => [String]) errors: string[];
}

@ObjectType()
class ChronotypeResult {
  @Field() chronotype: string;
}

@Resolver()
export class BiometricResolver {
  constructor(private bio: BiometricService) {}

  @Mutation(() => BiometricSyncResult)
  @UseGuards(GqlAuthGuard)
  async syncBiometricData(@CurrentUser() user: any, @Args('entries', { type: () => [BiometricSyncInput] }) entries: BiometricSyncInput[]) {
    const formattedEntries: BiometricEntry[] = entries.map(e => ({
      time: new Date(),
      userId: user.id,
      sleepHours: e.sleepHours,
      hrv: e.hrv,
      stressIndex: e.stressIndex,
      restingHr: e.restingHr,
      steps: e.steps,
      source: e.source || 'manual',
    }));
    return this.bio.syncEntries(user.id, formattedEntries);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async biometricDailySummary(@CurrentUser() user: any, @Args('date', { defaultValue: () => new Date() }) date: Date) {
    return this.bio.getDailySummary(user.id, date);
  }

  @Query(() => ChronotypeResult)
  @UseGuards(GqlAuthGuard)
  async myChronotype(@CurrentUser() user: any) {
    const chronotype = await this.bio.calculateChronotype(user.id);
    return { chronotype };
  }
}
