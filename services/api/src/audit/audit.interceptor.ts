import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AuditContext {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const body = request.body;

    if (!user || this.isExcludedRoute(url)) {
      return next.handle();
    }

    const action = this.getAction(method, url);
    const entityType = this.getEntityType(url);
    const entityId = this.extractEntityId(url, body);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (result) => {
          await this.logAudit({
            actorId: user.id || 'system',
            action,
            entityType,
            entityId,
            metadata: {
              method,
              url,
              responseTime: Date.now() - startTime,
              status: 'success',
              result: this.sanitizeForAudit(result),
            },
          });
        },
        error: async (error) => {
          await this.logAudit({
            actorId: user.id || 'system',
            action,
            entityType,
            entityId,
            metadata: {
              method,
              url,
              responseTime: Date.now() - startTime,
              status: 'error',
              error: error.message,
            },
          });
        },
      }),
    );
  }

  private async logAudit(auditContext: AuditContext): Promise<void> {
    try {
      const payloadString = JSON.stringify({
        ...auditContext,
        timestamp: new Date().toISOString(),
      });

      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

      await this.prisma.$executeRaw`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, payload_hash, metadata, timestamp)
        VALUES (
          ${crypto.randomUUID()},
          ${auditContext.actorId},
          ${auditContext.action},
          ${auditContext.entityType},
          ${auditContext.entityId || null},
          ${payloadHash},
          ${JSON.stringify(auditContext.metadata || {})},
          NOW()
        )
      `;

      this.logger.debug(`Audit log: ${auditContext.action} on ${auditContext.entityType} by ${auditContext.actorId}`);
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

  private isExcludedRoute(url: string): boolean {
    const excluded = ['/health', '/metrics', '/webhook', '/auth/refresh', '/auth/login'];
    return excluded.some((path) => url.includes(path));
  }

  private getAction(method: string, url: string): string {
    const actionMap: Record<string, string> = {
      'POST': 'CREATE',
      'GET': 'READ',
      'PUT': 'UPDATE',
      'PATCH': 'UPDATE',
      'DELETE': 'DELETE',
    };
    return `${actionMap[method] || 'UNKNOWN'}_${this.getEntityType(url).toUpperCase()}`;
  }

  private getEntityType(url: string): string {
    const segments = url.split('/').filter(Boolean);
    const resourceIndex = segments.findIndex((s) => s === 'graphql' || s === 'api');
    const entity = segments[resourceIndex + 1] || 'unknown';
    return entity.replace(/[-_]/g, '').toLowerCase();
  }

  private extractEntityId(url: string, body: any): string | undefined {
    const uuidMatch = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) return uuidMatch[0];
    if (body?.id) return body.id;
    return undefined;
  }

  private sanitizeForAudit(data: any): any {
    if (!data) return undefined;
    if (typeof data === 'string') return data.substring(0, 500);
    if (data.password || data.token || data.secret) {
      return { ...data, password: '***', token: '***', secret: '***' };
    }
    return data;
  }
}