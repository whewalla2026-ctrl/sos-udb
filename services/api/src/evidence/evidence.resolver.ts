import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EvidenceService } from './evidence.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class EvidenceResolver {
  constructor(private ev: EvidenceService) {}

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async evidenceGallery(@CurrentUser() user: any) { return this.ev.getEvidenceGallery(user.id); }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async addEvidence(@CurrentUser() user: any, @Args('title') title: string, @Args('url') url: string, @Args('type') type: string, @Args('questId', { nullable: true }) questId?: string) {
    return this.ev.addEvidence(user.id, { title, url, type, questId });
  }
}
