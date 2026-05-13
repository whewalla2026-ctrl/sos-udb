import { Resolver, Mutation, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TutorService } from './tutor.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class TutorResolver {
  constructor(private tutor: TutorService) {}

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async startTutoringSession(
    @CurrentUser() user: any,
    @Args('subject') subject: string,
    @Args('assignmentId', { nullable: true }) assignmentId?: string,
  ) {
    return this.tutor.createSession(user.id, subject, assignmentId);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async tutoringSession(@Args('id') id: string) {
    return this.tutor.getSession(id);
  }

  @Query(() => [GraphQLJSON])
  @UseGuards(GqlAuthGuard)
  async myTutoringSessions(
    @CurrentUser() user: any,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.tutor.getUserSessions(user.id, limit || 10);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async askSocraticTutor(
    @CurrentUser() user: any,
    @Args('sessionId') sessionId: string,
    @Args('input') input: string,
  ) {
    return this.tutor.ask(user.id, sessionId, input);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async endTutoringSession(@Args('id') id: string) {
    return this.tutor.endSession(id);
  }

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async trackTopicMastery(
    @CurrentUser() user: any,
    @Args('subject') subject: string,
    @Args('topic') topic: string,
    @Args('correct') correct: boolean,
  ) {
    return this.tutor.trackTopicMastery(user.id, subject, topic, correct);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async myTutorAnalytics(@CurrentUser() user: any) {
    return this.tutor.getAnalytics(user.id);
  }

  @Query(() => [GraphQLJSON])
  @UseGuards(GqlAuthGuard)
  async myTopics(
    @CurrentUser() user: any,
    @Args('subject', { nullable: true }) subject?: string,
  ) {
    return this.tutor.getTopics(user.id, subject);
  }

  @Query(() => [GraphQLJSON])
  @UseGuards(GqlAuthGuard)
  async tutorRecommendations(@CurrentUser() user: any) {
    return this.tutor.getRecommendations(user.id);
  }
}
