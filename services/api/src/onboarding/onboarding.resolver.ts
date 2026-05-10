import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { UserRole } from '../shared/user-role';

@ObjectType()
class OnboardingStatusType {
  @Field() id: string;
  @Field() userId: string;
  @Field(() => Int) currentStep: number;
  @Field(() => Int) totalSteps: number;
  @Field() completed: boolean;
  @Field() skipped: boolean;
  @Field() profileComplete: boolean;
  @Field() doterNamed: boolean;
  @Field() firstQuestDone: boolean;
  @Field() tourCompleted: boolean;
  @Field() role: string;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
}

@ObjectType()
class OnboardingStatsType {
  @Field(() => Int) total: number;
  @Field(() => Int) completed: number;
  @Field() completionRate: number;
  @Field() avgSteps: number;
}

@Resolver()
export class OnboardingResolver {
  constructor(private onboarding: OnboardingService) {}

  @Query(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async onboardingStatus(@CurrentUser() user: any) {
    return this.onboarding.getStatus(user.id);
  }

  @Query(() => OnboardingStatsType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async onboardingStats() {
    return this.onboarding.getCompletionStats();
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async updateOnboardingStep(@CurrentUser() user: any, @Args('step', { type: () => Int }) step: number) {
    return this.onboarding.updateStep(user.id, step);
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async completeOnboarding(@CurrentUser() user: any) {
    return this.onboarding.complete(user.id);
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async skipOnboarding(@CurrentUser() user: any) {
    return this.onboarding.skip(user.id);
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async updateOnboardingProfile(@CurrentUser() user: any) {
    return this.onboarding.updateProfileComplete(user.id);
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async updateOnboardingDoterNamed(@CurrentUser() user: any) {
    return this.onboarding.updateDoterNamed(user.id);
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async updateOnboardingFirstQuestDone(@CurrentUser() user: any) {
    return this.onboarding.updateFirstQuestDone(user.id);
  }

  @Mutation(() => OnboardingStatusType)
  @UseGuards(GqlAuthGuard)
  async updateOnboardingTourCompleted(@CurrentUser() user: any) {
    return this.onboarding.updateTourCompleted(user.id);
  }
}
