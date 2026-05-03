import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GoalsService } from './goals.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class GoalsResolver {
  constructor(private goals: GoalsService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async myGoals(@CurrentUser() user: any) { return this.goals.getGoals(user.id); }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async createGoal(@CurrentUser() user: any, @Args('title') title: string, @Args('pillar') pillar: string) {
    return this.goals.createGoal(user.id, { title, pillar: pillar as any });
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async goalProgress(@Args('goalId') goalId: string) { return this.goals.getProgress(goalId); }
}
