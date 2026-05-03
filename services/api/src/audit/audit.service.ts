import { Injectable } from '@nestjs/common'; import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  async getLogs(actorId: string, limit = 50) { return this.prisma.auditLog.findMany({ where: { actorId }, orderBy: { createdAt: 'desc' }, take: limit }); }
  async write(data: { actorId: string; action: string; targetType?: string; targetId?: string; payload?: any }) { return this.prisma.auditLog.create({ data }); }
}
