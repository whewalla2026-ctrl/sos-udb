import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class ActivitiesResolver {
  constructor(private activities: ActivitiesService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async myCalendar(@CurrentUser() user: any, @Args('from') from: string, @Args('to') to: string) {
    return this.activities.getUserCalendar(user.id, new Date(from), new Date(to));
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async createActivity(@CurrentUser() user: any, @Args('title') title: string, @Args('startTime') startTime: string, @Args('endTime') endTime: string, @Args('pillar', { nullable: true }) pillar?: string): Promise<unknown> {
    return this.activities.createActivity(user.id, { title, startTime: new Date(startTime), endTime: new Date(endTime), pillar: pillar as any });
  }
}
