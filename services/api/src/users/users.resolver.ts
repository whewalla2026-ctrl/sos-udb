import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType() class DoterProfileType {
  @Field() id: string;
  @Field() state: string;
  @Field() name: string;
  @Field() level: number;
  @Field() xp: number;
  @Field() coinBalance: number;
  @Field() streakDays: number;
  @Field() isSluggy: boolean;
  @Field() isEnergetic: boolean;
}

@ObjectType() class UserType {
  @Field() id: string;
  @Field() email: string;
  @Field({ nullable: true }) displayName?: string;
  @Field({ nullable: true }) avatarUrl?: string;
  @Field() role: string;
  @Field({ nullable: true }) doterProfile?: DoterProfileType;
  @Field(() => GraphQLJSON, { nullable: true }) uupData?: any;
  @Field(() => GraphQLJSON) accessibilitySettings: any;
  @Field() createdAt: Date;
}

@InputType() class UpdateProfileInput {
  @Field({ nullable: true }) displayName?: string;
  @Field({ nullable: true }) avatarUrl?: string;
  @Field({ nullable: true }) timezone?: string;
}

@Resolver()
export class UsersResolver {
  constructor(private users: UsersService) {}

  @Query(() => UserType)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: any) {
    return this.users.findById(user.id);
  }

  @Mutation(() => UserType)
  @UseGuards(GqlAuthGuard)
  async updateProfile(@CurrentUser() user: any, @Args('data') data: UpdateProfileInput) {
    return this.users.updateProfile(user.id, data);
  }

  @Query(() => [UserType])
  @UseGuards(GqlAuthGuard)
  async myChildren(@CurrentUser() user: any) {
    return this.users.getChildren(user.id);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async dashboardData(@CurrentUser() user: any) {
    return this.users.getDashboardData(user.id);
  }
}
