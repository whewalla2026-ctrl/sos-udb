import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UUPService {
  private store: any = {};
  private faultDelayMs: number = parseInt(process.env.FAULT_DB_DELAY_MS || '0');
  private faultFailRate: number = parseFloat(process.env.FAULT_DB_FAIL_RATE || '0');
  private useDb: boolean;
  private prisma: PrismaClient | null = null;

  constructor() {
    // If UDB_USE_INMEMORY is set, run in-memory mode; otherwise use DB-backed mode.
    this.useDb = process.env.UDB_USE_INMEMORY !== 'true';
    if (this.useDb) {
      this.prisma = new PrismaClient();
    }
  }

  getUser(userId: string) {
    if (this.useDb && this.prisma) {
      return this.prisma.userMaster.findUnique({ where: { id: userId } });
    }
    return this.store[userId] || null;
  }

  async upsertUser(userId: string, payload: any) {
    // Simulate failure injection for failure scenarios
    if (this.faultFailRate > 0) {
      if (Math.random() < this.faultFailRate) {
        // simulate a transient DB error
        throw new Error('Simulated DB write failure (phase2 fault injection)');
      }
    }
    if (this.faultDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.faultDelayMs));
    }
    // Normalize payload shape
    const incoming = payload?.uup_data ?? {};
    if (this.useDb && this.prisma) {
      // Try to fetch existing
      const existing = await this.prisma.userMaster.findUnique({ where: { id: userId } });
      let merged = {} as any;
      if (existing) {
        merged = { ...existing.uup_data, ...incoming };
        await this.prisma.userMaster.update({ where: { id: userId }, data: { uup_data: merged } });
      } else {
        // Create with a synthetic email if not present in payload
        const email = (`user_${userId}@local`).toString();
        merged = incoming;
        await this.prisma.userMaster.create({ data: { id: userId, email, uup_data: merged } });
      }

      // Evolution logic on merged data
      const acadQuests = ((merged as any).milestones?.academicQuests) ?? 0;
      const bioQuests = ((merged as any).milestones?.biometricQuests) ?? 0;
      const currentState = (((merged as any).gamification?.doter_state) ?? 'egg');
      const newState = (acadQuests >= 10 && bioQuests >= 5) ? 'juvenile' : currentState;
      if (newState !== currentState) {
        await this.prisma.userMaster.update({ where: { id: userId }, data: { uup_data: { ...(merged as any), gamification: { ...(merged as any).gamification, doter_state: newState } } } });
      }
      // Return the updated record from DB
      const rec = await this.prisma.userMaster.findUnique({ where: { id: userId } });
      return rec;
    }

    // In-memory path
    const current = this.store[userId] || { uup_data: {} };
    // Merge payload into current record
    let updated = { ...current, ...payload };

    // Normalized accessors with safe defaults
    const uup = updated.uup_data || {};
    const milestones = uup.milestones || {};
    const acadQuests = milestones.academicQuests ?? 0;
    const bioQuests = milestones.biometricQuests ?? 0;
    const currentState = (uup.gamification?.doter_state) ?? 'egg';
    let newState = currentState;
    // Evolution logic: 10 academic quests and 5 biometric quests evolve to juvenile
    if (acadQuests >= 10 && bioQuests >= 5) {
      newState = 'juvenile';
    }

    // Ensure uup_data.gamification exists and set new state if changed
    updated.uup_data = {
      ...uup,
      gamification: {
        ...(uup.gamification || {}),
        doter_state: newState
      },
    };

    // Persist in in-memory store
    this.store[userId] = updated;
    return this.store[userId];
  }
}
