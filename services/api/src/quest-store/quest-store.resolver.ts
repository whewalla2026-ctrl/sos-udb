import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QuestStoreService, QuestSubmission, QuestStoreListing } from './quest-store.service';

@Resolver()
export class QuestStoreResolver {
  constructor(private questStore: QuestStoreService) {}

  @Query(() => [String])
  async browseQuests(
    @Args('query', { nullable: true }) query: string,
    @Args('ageMin', { type: () => Int, nullable: true }) ageMin?: number,
    @Args('ageMax', { type: () => Int, nullable: true }) ageMax?: number,
    @Args('skillTag', { nullable: true }) skillTag?: string,
  ): Promise<QuestStoreListing[]> {
    return this.questStore.searchQuests(query || '', { ageMin, ageMax, skillTag });
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard)
  async submitQuest(
    @CurrentUser() user: any,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('ageMin', { type: () => Int }) ageMin: number,
    @Args('ageMax', { type: () => Int }) ageMax: number,
    @Args('skillTags', { type: () => [String] }) skillTags: string[],
    @Args('estimatedDuration', { type: () => Int }) estimatedDuration: number,
  ): Promise<string> {
    const submission: QuestSubmission = {
      title, description, ageMin, ageMax, skillTags, estimatedDuration,
      creatorId: user.id,
    };
    return this.questStore.submitQuest(submission);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async purchaseQuest(
    @CurrentUser() user: any,
    @Args('questId') questId: string,
  ): Promise<boolean> {
    await this.questStore.purchaseQuest(questId, user.id);
    return true;
  }

  @Query(() => [String])
  @UseGuards(GqlAuthGuard)
  async creatorAnalytics(@CurrentUser() user: any): Promise<any> {
    return this.questStore.getCreatorAnalytics(user.id);
  }
}
