import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UUPService } from './uup.service';

@Resolver()
export class UUPResolver {
  constructor(private readonly uupService: UUPService) {}

  @Query(() => String, { name: 'getUserUUP' })
  getUser(@Args('userId') userId: string): string {
    const user = this.uupService.getUser(userId);
    return user ? JSON.stringify(user.uup_data) : '{}';
  }

  @Mutation(() => String, { name: 'upsertUserUUP' })
  upsert(@Args('userId') userId: string, @Args('payload') payload: any): string {
    const updated = this.uupService.upsertUser(userId, { uup_data: payload });
    return JSON.stringify(updated);
  }
}
