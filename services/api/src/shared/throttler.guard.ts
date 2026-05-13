import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class UdbThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): { req: Record<string, any>; res: Record<string, any> } {
    const gql = GqlExecutionContext.create(context);
    if (gql.getType() === 'graphql') {
      const ctx = gql.getContext();
      return { req: ctx.req || {}, res: ctx.res || {} };
    }
    const http = context.switchToHttp();
    return { req: http.getRequest() || {}, res: http.getResponse() || {} };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req } = this.getRequestResponse(context);

    if (req?.url === '/metrics' || req?.route?.path === '/metrics') {
      return true;
    }

    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.sub || req.user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    return req.ip || 'anonymous';
  }
}
