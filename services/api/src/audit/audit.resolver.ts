import { Resolver, Query, Args, Int } from '@nestjs/graphql'; import { UseGuards } from '@nestjs/common'; import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'; import { CurrentUser } from '../auth/decorators/current-user.decorator'; import { AuditService } from './audit.service'; import { GraphQLJSON } from 'graphql-type-json';
@Resolver() export class AuditResolver {
  constructor(private audit: AuditService) {}
  @Query(() => GraphQLJSON) @UseGuards(GqlAuthGuard) async auditLog(@CurrentUser() user: any, @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number) { return this.audit.getLogs(user.id, limit); }
}
