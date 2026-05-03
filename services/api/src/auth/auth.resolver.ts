import { Resolver, Mutation, Args, ObjectType, Field } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UserRole } from '@prisma/client';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
class AuthPayload {
  @Field() accessToken: string;
  @Field() userId: string;
  @Field() email: string;
  @Field(() => UserRole) role: UserRole;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async loginWithFirebase(
    @Args('idToken') idToken: string,
    @Args('role', { type: () => UserRole, defaultValue: UserRole.PARENT }) role: UserRole,
  ): Promise<AuthPayload> {
    const { accessToken, user } = await this.authService.loginWithFirebase(idToken, role as any);
    return { accessToken, userId: user.id, email: user.email, role: user.role };
  }
}
