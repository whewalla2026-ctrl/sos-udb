import { Resolver, Mutation, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class BillingResolver {
  constructor(private billing: BillingService) {}

  @Query(() => [GraphQLJSON])
  async billingPlans() {
    return this.billing.getPlans();
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async mySubscription(@CurrentUser() user: any) {
    return this.billing.getMySubscription(user.id);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async createCheckoutSession(
    @CurrentUser() user: any,
    @Args('planId') planId: string,
    @Args('successUrl') successUrl: string,
    @Args('cancelUrl') cancelUrl: string,
  ) {
    return this.billing.createCheckoutSession(user.id, planId, successUrl, cancelUrl);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async createPortalSession(
    @CurrentUser() user: any,
    @Args('returnUrl') returnUrl: string,
  ) {
    return this.billing.createPortalSession(user.id, returnUrl);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async cancelSubscription(@CurrentUser() user: any) {
    return this.billing.cancelSubscription(user.id);
  }

  @Query(() => [GraphQLJSON])
  @UseGuards(GqlAuthGuard)
  async myInvoices(
    @CurrentUser() user: any,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.billing.getInvoices(user.id, limit || 20);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async trackUsage(
    @CurrentUser() user: any,
    @Args('metric') metric: string,
    @Args('value', { type: () => Int }) value: number,
  ) {
    return this.billing.trackUsage(user.id, metric, value);
  }
}
