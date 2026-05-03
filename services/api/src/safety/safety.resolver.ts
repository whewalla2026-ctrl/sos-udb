import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafetyService } from './safety.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class SafetyResolver {
  constructor(private safety: SafetyService) {}

  @Query(() => GraphQLJSON, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async mySafetyScore(@CurrentUser() user: any) {
    return this.safety.getLatestSafetyScore(user.id);
  }
}
