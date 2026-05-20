import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../shared/user-role';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { GdprService } from './gdpr.service';
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

@ObjectType() class GdprDeletionResponse {
  @Field() deletionId: string;
  @Field() scheduledDate: string;
}

@ObjectType() class GdprConsentStatus {
  @Field(() => GraphQLJSON) coppaConsent: any;
  @Field() gdprDeleteRequested: boolean;
  @Field(() => [GraphQLJSON]) consentHistory: any[];
}

@InputType() class ConsentInput {
  @Field() consentType: string;
  @Field() granted: boolean;
}

@Resolver()
export class UsersResolver {
  constructor(private users: UsersService, private gdpr: GdprService) {}

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
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  async myChildren(@CurrentUser() user: any) {
    return this.users.getChildren(user.id);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async dashboardData(@CurrentUser() user: any) {
    return this.users.getDashboardData(user.id);
  }

  @Query(() => GraphQLJSON)
  @UseGuards(GqlAuthGuard)
  async exportUserData(@CurrentUser() user: any) {
    return this.gdpr.exportUserData(user.id);
  }

  @Mutation(() => GdprDeletionResponse)
  @UseGuards(GqlAuthGuard)
  async requestDeletion(@CurrentUser() user: any) {
    return this.gdpr.requestDeletion(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async cancelDeletion(@CurrentUser() user: any) {
    return this.gdpr.cancelDeletionRequest(user.id);
  }

  @Query(() => GdprConsentStatus)
  @UseGuards(GqlAuthGuard)
  async getConsentStatus(@CurrentUser() user: any) {
    return this.gdpr.getConsentStatus(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async recordConsent(@CurrentUser() user: any, @Args('consent') consent: ConsentInput) {
    return this.gdpr.recordConsent(user.id, consent.consentType, consent.granted);
  }
}
