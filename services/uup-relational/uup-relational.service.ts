import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UupRelationalService {
  private prisma = new PrismaClient();

  async createUserRelation(userId: string, email: string) {
    await this.prisma.userMaster.create({ data: { id: userId, email, uup_data: {} } }).catch(() => {});
    await this.prisma.userRel.create({ data: { userId, role: 'CHILD' } }).catch(() => {});
    return { userId, email };
  }

  async addGoal(userId: string, title: string, target: string) {
    return this.prisma.goal.create({ data: { userId, title, target, progress: 0 } });
  }
}
