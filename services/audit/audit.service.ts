import { Injectable } from '@nestjs/common';
import { AuditLedger } from '../../audit-ledger/audit-ledger';
import { PrismaClient } from '@prisma/client';

type AuditLogEntry = {
  id: string;
  userId?: string;
  event: string;
  payload?: any;
  timestamp: string;
};

@Injectable()
export class AuditService {
  private logs: AuditLogEntry[] = [];
  private ledger: AuditLedger;
  private prisma: PrismaClient;

  constructor() {
    this.ledger = new AuditLedger();
    this.prisma = new PrismaClient();
  }

  async logEvent(userId: string | undefined, event: string, payload?: any) {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.logs = [...this.logs, entry];
    // Persist in immutable ledger as well (file-based WAL)
    const ledgerPayload = { id: entry.id, userId, event, payload, timestamp: entry.timestamp };
    const r = this.ledger.logEvent(ledgerPayload);
    // Persist in DB (immutable audit log) as well
    try {
      await this.prisma.auditLog.create({
        data: {
          id: entry.id,
          userId: userId ?? null,
          event,
          payload,
          timestamp: new Date(entry.timestamp),
          hash: r?.hash ?? null,
          prevHash: null,
        },
      });
    } catch (e) {
      // Non-fatal; log only in ledger if DB fails
      console.warn('Audit DB write failed', e);
    }
    return { ...entry, ledgerHash: r?.hash };
  }

  getLogs(userId?: string) {
    if (!userId) return this.logs;
    return this.logs.filter((l) => l.userId === userId);
  }
}
