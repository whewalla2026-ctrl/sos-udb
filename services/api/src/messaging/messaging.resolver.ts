import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import { GraphQLJSON } from 'graphql-type-json';

@Resolver()
export class MessagingResolver {
  constructor(private msg: MessagingService) {}

  @Mutation(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async sendMessage(@CurrentUser() user: any, @Args('receiverId') receiverId: string, @Args('content') content: string) {
    return this.msg.sendMessage(user.id, receiverId, content);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async inbox(@CurrentUser() user: any) { return this.msg.getInbox(user.id); }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async conversation(@CurrentUser() user: any, @Args('withUserId') withUserId: string) {
    return this.msg.getConversation(user.id, withUserId);
  }
}
