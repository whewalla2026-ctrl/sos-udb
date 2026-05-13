import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectType, Field } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { UserRole } from '../shared/user-role';

@ObjectType()
class AnalyticsOverviewType {
  @Field(() => Int) dau: number;
  @Field(() => Int) wau: number;
  @Field(() => Int) mau: number;
  @Field(() => Int) totalUsers: number;
  @Field(() => Int) signupsToday: number;
  @Field() onboardingCompletionRate: number;
  @Field() churnRate: number;
}

@ObjectType()
class RetentionType {
  @Field() day1: number;
  @Field() day3: number;
  @Field() day7: number;
  @Field() day14: number;
  @Field() day30: number;
}

@ObjectType()
class FeatureUsageDailyType {
  @Field() date: string;
  @Field(() => Int) count: number;
}

@ObjectType()
class FeatureUsageType {
  @Field() event: string;
  @Field(() => Int) usageCount: number;
}

@ObjectType()
class FunnelStepType {
  @Field() label: string;
  @Field(() => Int) count: number;
  @Field() conversionRate: number;
}

@ObjectType()
class OnboardingCompletionType {
  @Field(() => Int) total: number;
  @Field(() => Int) completed: number;
  @Field() rate: number;
}

@ObjectType()
class ActivationMetricItem {
  @Field(() => Int) count: number;
  @Field() rate: number;
}

@ObjectType()
class ActivationMetricsType {
  @Field(() => Int) totalUsers: number;
  @Field() onboardingCompleted: ActivationMetricItem;
  @Field() doterNamed: ActivationMetricItem;
  @Field() questsCreated: ActivationMetricItem;
  @Field() questsCompleted: ActivationMetricItem;
}

@ObjectType()
class BillingConversionType {
  @Field(() => Int) total: number;
  @Field(() => Int) paid: number;
  @Field() rate: number;
}

@ObjectType()
class ChurnIndicatorType {
  @Field() id: string;
  @Field({ nullable: true }) displayName: string;
  @Field() email: string;
  @Field({ nullable: true }) lastSeenAt: Date;
  @Field() createdAt: Date;
}

@ObjectType()
class DAUType {
  @Field() date: string;
  @Field(() => Int) count: number;
}

@ObjectType()
class WAUType {
  @Field() week: string;
  @Field(() => Int) count: number;
}

@ObjectType()
class MAUType {
  @Field() month: string;
  @Field(() => Int) count: number;
}

@Resolver()
export class AnalyticsResolver {
  constructor(private analytics: AnalyticsService) {}

  @Query(() => AnalyticsOverviewType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsOverview() {
    return this.analytics.getOverview();
  }

  @Query(() => RetentionType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsRetention(@Args('days', { type: () => Int, defaultValue: 30 }) days: number) {
    return this.analytics.getRetention(days);
  }

  @Query(() => [FeatureUsageType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsFeatureUsage(
    @Args('feature') feature: string,
    @Args('days', { type: () => Int, defaultValue: 30 }) days: number,
  ) {
    return this.analytics.getFeatureUsage(feature, days);
  }

  @Query(() => [FunnelStepType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsSignupFunnel(@Args('days', { type: () => Int, defaultValue: 30 }) days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.analytics.getSignupConversion(startDate, endDate);
  }

  @Query(() => [DAUType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsDAU(@Args('days', { type: () => Int, defaultValue: 7 }) days: number) {
    return this.analytics.getDAU(days);
  }

  @Query(() => [WAUType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsWAU(@Args('weeks', { type: () => Int, defaultValue: 8 }) weeks: number) {
    return this.analytics.getWAU(weeks);
  }

  @Query(() => [MAUType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsMAU(@Args('months', { type: () => Int, defaultValue: 12 }) months: number) {
    return this.analytics.getMAU(months);
  }

  @Query(() => OnboardingCompletionType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsOnboardingCompletion() {
    return this.analytics.getOnboardingCompletion();
  }

  @Query(() => [ChurnIndicatorType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsChurnIndicators(@Args('days', { type: () => Int, defaultValue: 30 }) days: number) {
    return this.analytics.getChurnIndicators(days);
  }

  @Query(() => BillingConversionType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsBillingConversion() {
    return this.analytics.getBillingConversion();
  }

  @Query(() => ActivationMetricsType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsActivationMetrics() {
    return this.analytics.getActivationMetrics();
  }

  @Query(() => [FeatureUsageDailyType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async analyticsFeatureUsageDaily(
    @Args('feature') feature: string,
    @Args('days', { type: () => Int, defaultValue: 30 }) days: number,
  ) {
    return this.analytics.getFeatureUsageDaily(feature, days);
  }
}
