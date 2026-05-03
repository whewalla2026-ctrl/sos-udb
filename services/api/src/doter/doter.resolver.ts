import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DoterService } from './doter.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class DoterResolver {
  constructor(private doter: DoterService) {}

  @Query(() => GraphQLJSON, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async myDoter(@CurrentUser() user: any) {
    return this.doter.getDoter(user.id);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async nameMyDoter(@CurrentUser() user: any, @Args('name') name: string) {
    return this.doter.nameDoter(user.id, name);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async addDoterXP(@CurrentUser() user: any, @Args('xp', { type: () => Int }) xp: number) {
    return this.doter.addXP(user.id, xp);
  }
}
