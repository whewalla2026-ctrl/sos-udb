import { Resolver, Mutation, Args, ObjectType, Field, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UserRole } from '@prisma/client';
import { registerEnumType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { Response } from 'express';

registerEnumType(UserRole, { name: 'UserRole' });

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}

@ObjectType()
class AuthPayload {
  @Field() accessToken: string;
  @Field() refreshToken: string;
  @Field() userId: string;
  @Field() email: string;
  @Field(() => UserRole) role: UserRole;
}

@ObjectType()
class RefreshPayload {
  @Field() accessToken: string;
  @Field() refreshToken: string;
  @Field() userId: string;
  @Field() email: string;
  @Field(() => UserRole) role: UserRole;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Mutation(() => AuthPayload)
  async loginWithFirebase(
    @Args('idToken') idToken: string,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const { accessToken, refreshToken, user } = await this.authService.loginWithFirebase(idToken);
    const res: Response = context.res;
    if (res) setAuthCookies(res, accessToken, refreshToken);
    return { accessToken, refreshToken, userId: user.id, email: user.email, role: user.role };
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Mutation(() => RefreshPayload)
  async refreshToken(
    @Args('refreshToken') refreshToken: string,
    @Context() context: any,
  ): Promise<RefreshPayload> {
    const result = await this.authService.refreshAccessToken(refreshToken);
    const res: Response = context.res;
    if (res) setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async logout(
    @Args('refreshToken') refreshToken: string,
    @Context() context: any,
  ): Promise<boolean> {
    const token = context.req.headers.authorization?.replace('Bearer ', '') || context.req.cookies?.access_token;
    await this.authService.logout(token || '', refreshToken);
    const res: Response = context.res;
    if (res) clearAuthCookies(res);
    return true;
  }
}
