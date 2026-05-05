import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BiometricService } from './biometric.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class BiometricResolver {
  constructor(private bio: BiometricService) {}

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async logBiometric(@CurrentUser() user: any, @Args('data') data: string) {
    return this.bio.logBiometric(user.id, { ...JSON.parse(data), source: 'MANUAL' });
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async biometricHistory(@CurrentUser() user: any, @Args('days', { defaultValue: 30 }) days: number) {
    return this.bio.getBiometricHistory(user.id, days);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async focusPeak(@CurrentUser() user: any) {
    return this.bio.analyzeFocusPeak(user.id);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async resilienceMetrics(@CurrentUser() user: any) {
    return this.bio.calculateResilienceMetrics(user.id);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async plasticityWindows(@CurrentUser() user: any) {
    return this.bio.getPeakPlasticityWindows(user.id);
  }
}
