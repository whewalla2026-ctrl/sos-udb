import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/user-role';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FamilyService } from './family.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class FamilyResolver {
  constructor(private family: FamilyService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  async myFamily(@CurrentUser() user: any) {
    return this.family.getFamily(user.id);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  async linkChild(
    @CurrentUser() user: any,
    @Args('childId') childId: string,
    @Args('consentMethod') consentMethod: string,
  ) {
    return this.family.linkChildToParent(user.id, childId, consentMethod);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  async unlinkChild(
    @CurrentUser() user: any,
    @Args('childId') childId: string,
  ) {
    return this.family.unlinkChild(user.id, childId);
  }
}
