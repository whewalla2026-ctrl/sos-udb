import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EntrepreneurshipService } from './entrepreneurship.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class EntrepreneurshipResolver {
  constructor(private ep: EntrepreneurshipService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async myVentures(@CurrentUser() user: any) { return this.ep.getVentures(user.id); }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async createVenture(@CurrentUser() user: any, @Args('name') name: string, @Args('problem') problem: string, @Args('solution') solution: string, @Args('targetMarket') targetMarket: string, @Args('pricingModel') pricingModel: string) {
    return this.ep.createVenture(user.id, { name, problem, solution, targetMarket, pricingModel });
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async releaseFunds(@CurrentUser() user: any, @Args('escrowId') escrowId: string) {
    return this.ep.releaseFunds(escrowId, user.id);
  }
}
