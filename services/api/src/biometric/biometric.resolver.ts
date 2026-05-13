import { Resolver, Query, Mutation, Args, InputType, Field, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BiometricService } from './biometric.service';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
class BiometricInput {
  @Field(() => Int, { nullable: true }) sleepHours?: number;
  @Field(() => Int, { nullable: true }) focusScore?: number;
  @Field(() => Int, { nullable: true }) stressLevel?: number;
  @Field({ nullable: true }) notes?: string;
}

@Resolver()
export class BiometricResolver {
  constructor(private bio: BiometricService) {}

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async logBiometric(@CurrentUser() user: any, @Args('data') data: BiometricInput) {
    return this.bio.logBiometric(user.id, { ...data, source: 'MANUAL' });
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
}
