import { Resolver, Mutation, Query, Args, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { UserRole } from '../shared/user-role';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';

@ObjectType()
class SetCustomClaimResult {
  @Field() success: boolean;
  @Field() uid: string;
  @Field(() => PrismaUserRole) role: PrismaUserRole;
}

@ObjectType()
class FirebaseUserInfo {
  @Field() uid: string;
  @Field() email: string;
  @Field({ nullable: true }) displayName: string;
  @Field({ nullable: true }) role: string;
}

@Resolver()
export class AdminAuthResolver {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Mutation(() => SetCustomClaimResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setFirebaseCustomClaim(
    @Args('uid') uid: string,
    @Args('role', { type: () => PrismaUserRole }) role: PrismaUserRole,
  ): Promise<SetCustomClaimResult> {
    if (!admin.apps.length) {
      throw new Error('Firebase not configured');
    }

    await admin.auth().setCustomUserClaims(uid, { role });

    await this.prisma.user.updateMany({
      where: { firebaseUid: uid },
      data: { role },
    });

    return { success: true, uid, role };
  }

  @Query(() => [FirebaseUserInfo])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listFirebaseUsers(
    @Args('maxResults', { nullable: true, defaultValue: 100 }) maxResults: number,
  ): Promise<FirebaseUserInfo[]> {
    if (!admin.apps.length) {
      throw new Error('Firebase not configured');
    }

    const listResult = await admin.auth().listUsers(Math.min(maxResults, 1000));
    return listResult.users.map(function(u) {
      return {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        role: (u.customClaims as any)?.role || null,
      };
    });
  }

  @Mutation(() => SetCustomClaimResult)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUserRole(
    @Args('userId') userId: string,
    @Args('role', { type: () => PrismaUserRole }) role: PrismaUserRole,
  ): Promise<SetCustomClaimResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, firebaseUid: true } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id: userId }, data: { role } });

    if (user.firebaseUid && admin.apps.length) {
      await admin.auth().setCustomUserClaims(user.firebaseUid, { role });
    }

    return { success: true, uid: user.firebaseUid || userId, role };
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(
    @Args('userId') userId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, firebaseUid: true } });
    if (!user) throw new NotFoundException('User not found');

    if (user.firebaseUid && admin.apps.length) {
      await admin.auth().deleteUser(user.firebaseUid);
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return true;
  }
}
