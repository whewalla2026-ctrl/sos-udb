import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'; import { UseGuards } from '@nestjs/common'; import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'; import { CurrentUser } from '../auth/decorators/current-user.decorator'; import { NotificationsService } from './notifications.service'; import { GraphQLJSON } from 'graphql-type-json';
@Resolver() export class NotificationsResolver {
  constructor(private n: NotificationsService) {}
  @Query(() => GraphQLJSON) @UseGuards(GqlAuthGuard) async unreadNotifications(@CurrentUser() user: any) { return this.n.getUnread(user.id); }
  @Mutation(() => GraphQLJSON) @UseGuards(GqlAuthGuard) async markNotificationRead(@Args('id') id: string) { return this.n.markRead(id); }
  @Mutation(() => GraphQLJSON) @UseGuards(GqlAuthGuard) async markAllRead(@CurrentUser() user: any) { return this.n.markAllRead(user.id); }
}
