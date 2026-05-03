import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AcademicService } from './academic.service';
import { QuestPillar } from '../shared/prisma-enums';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class AcademicResolver {
  constructor(private ac: AcademicService) {}
  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async mySkillGaps(@CurrentUser() user: any) {
    return this.ac.getSkillGaps(user.id);
  }
  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async updateSkillGap(@CurrentUser() user: any, @Args('subject') subject: string, @Args('gapScore') gapScore: number) {
    return this.ac.updateSkillGap(user.id, subject, QuestPillar.ACADEMIC, gapScore);
  }
  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async startTutoringSession(@CurrentUser() user: any, @Args('subject') subject: string) {
    return this.ac.startTutoringSession(user.id, subject);
  }
}
