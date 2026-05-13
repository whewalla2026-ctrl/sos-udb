import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/user-role';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QuestsService } from './quests.service';
import { QuestStatus, QuestPillar } from '../shared/prisma-enums';
import { GraphQLJSON } from 'graphql-type-json';

registerEnumType(QuestStatus, { name: 'QuestStatus' });
registerEnumType(QuestPillar, { name: 'QuestPillar' });

@ObjectType()
class QuestType {
  @Field() id: string;
  @Field() userId: string;
  @Field() title: string;
  @Field({ nullable: true }) description: string;
  @Field(() => QuestStatus) status: QuestStatus;
  @Field(() => QuestPillar) pillar: QuestPillar;
  @Field(() => Int) xpReward: number;
  @Field(() => Int) coinReward: number;
  @Field({ nullable: true }) goalId: string;
  @Field({ nullable: true }) dueDate: Date;
  @Field({ nullable: true }) proofUrl: string;
  @Field({ nullable: true }) proofType: string;
  @Field({ nullable: true }) aiConfidence: number;
  @Field({ nullable: true }) aiVerified: boolean;
  @Field({ defaultValue: false }) isChunk: boolean;
  @Field({ nullable: true }) parentQuestId: string;
  @Field(() => Int, { nullable: true }) chunkIndex: number;
  @Field(() => GraphQLJSON, { nullable: true }) metadata: any;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
}

@ObjectType()
class MicroQuestResult {
  @Field(() => QuestType) parentQuest: any;
  @Field(() => [QuestType]) chunks: any[];
}

@InputType()
class CreateQuestInput {
  @Field() title: string;
  @Field({ nullable: true }) description: string;
  @Field(() => QuestPillar) pillar: QuestPillar;
  @Field(() => Int, { nullable: true }) xpReward: number;
  @Field(() => Int, { nullable: true }) coinReward: number;
  @Field({ nullable: true }) goalId: string;
  @Field(() => Int, { nullable: true }) masteryWeight: number;
  @Field({ nullable: true }) dueDate: Date;
  @Field(() => GraphQLJSON, { nullable: true }) metadata: any;
}

@InputType()
class CreateMicroQuestsInput {
  @Field() title: string;
  @Field(() => QuestPillar) pillar: QuestPillar;
  @Field(() => Int) totalDurationMinutes: number;
  @Field(() => Int, { nullable: true }) chunkDurationMinutes: number;
}

@InputType()
class SubmitQuestInput {
  @Field() questId: string;
  @Field() proofUrl: string;
  @Field() proofType: string;
}

@InputType()
class ApproveQuestInput {
  @Field() questId: string;
  @Field(() => Int, { nullable: true }) aiConfidence: number;
}

@InputType()
class QuestFiltersInput {
  @Field(() => QuestStatus, { nullable: true }) status: QuestStatus;
  @Field(() => QuestPillar, { nullable: true }) pillar: QuestPillar;
}

@Resolver()
export class QuestsResolver {
  constructor(private readonly questsService: QuestsService) {}

  @Mutation(() => QuestType)
  @UseGuards(GqlAuthGuard)
  async createQuest(
    @CurrentUser() user: any,
    @Args('data') data: CreateQuestInput,
  ) {
    return this.questsService.createQuest(user.id, data);
  }

  @Mutation(() => MicroQuestResult)
  @UseGuards(GqlAuthGuard)
  async createMicroQuests(
    @CurrentUser() user: any,
    @Args('data') data: CreateMicroQuestsInput,
  ) {
    return this.questsService.createMicroQuests(user.id, data);
  }

  @Mutation(() => QuestType)
  @UseGuards(GqlAuthGuard)
  async submitQuest(
    @CurrentUser() user: any,
    @Args('data') data: SubmitQuestInput,
  ) {
    return this.questsService.submitQuest(data.questId, user.id, data.proofUrl, data.proofType);
  }

  @Mutation(() => QuestType)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT, UserRole.ADMIN)
  async approveQuest(
    @CurrentUser() user: any,
    @Args('data') data: ApproveQuestInput,
  ) {
    return this.questsService.approveQuest(data.questId, user.id, data.aiConfidence);
  }

  @Query(() => [QuestType])
  @UseGuards(GqlAuthGuard)
  async myQuests(
    @CurrentUser() user: any,
    @Args('filters', { nullable: true }) filters: QuestFiltersInput,
  ) {
    return this.questsService.getUserQuests(user.id, filters || undefined);
  }

  @Query(() => QuestType)
  @UseGuards(GqlAuthGuard)
  async questById(
    @CurrentUser() user: any,
    @Args('id') id: string,
  ) {
    return this.questsService.getQuestById(id, user.id);
  }

  @Query(() => [QuestType])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT, UserRole.ADMIN)
  async childQuests(
    @CurrentUser() user: any,
    @Args('childId') childId: string,
    @Args('filters', { nullable: true }) filters: QuestFiltersInput,
  ) {
    return this.questsService.getUserQuests(childId, filters || undefined);
  }
}
