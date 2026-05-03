import { Resolver, Query, Mutation } from '@nestjs/graphql'; import { UseGuards } from '@nestjs/common'; import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'; import { CurrentUser } from '../auth/decorators/current-user.decorator'; import { WeeklyPlanService } from './weekly-plan.service'; import { GraphQLJSON } from 'graphql-type-json';
@Resolver()
export class WeeklyPlanResolver {
  constructor(private wp: WeeklyPlanService) {}
  @Query(() => GraphQLJSON, { nullable: true }) @UseGuards(GqlAuthGuard) async myWeeklyPlan(@CurrentUser() user: any) { return this.wp.getLatestPlan(user.id); }
  @Mutation(() => GraphQLJSON) @UseGuards(GqlAuthGuard) async generateWeeklyPlan(@CurrentUser() user: any) { return this.wp.generateWeeklyPlan(user.id); }
}
