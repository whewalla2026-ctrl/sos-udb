import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FamilyService } from './family.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class FamilyResolver {
  constructor(private family: FamilyService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async myFamily(@CurrentUser() user: any) {
    return this.family.getFamily(user.id);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async linkChild(
    @CurrentUser() user: any,
    @Args('childId') childId: string,
    @Args('consentMethod') consentMethod: string,
  ) {
    return this.family.linkChildToParent(user.id, childId, consentMethod);
  }
}
