import { Module } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditInterceptor],
  exports: [AuditInterceptor],
})
export class AuditModule {}

import { Injectable } from '@nestjs/common';
import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@Resolver()
export class AuditResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [AuditLog])
  async auditLogs(
    @Args('actorId', { nullable: true }) actorId?: string,
    @Args('action', { nullable: true }) action?: string,
    @Args('entityType', { nullable: true }) entityType?: string,
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit?: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset?: number,
  ): Promise<any[]> {
    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    return this.prisma.$queryRaw`
      SELECT * FROM audit_logs
      WHERE ${actorId ? `actor_id = ${actorId}` : '1=1'}
      AND ${action ? `action = ${action}` : '1=1'}
      AND ${entityType ? `entity_type = ${entityType}` : '1=1'}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
}

export class AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  payloadHash: string;
  metadata?: any;
  timestamp: Date;
}
