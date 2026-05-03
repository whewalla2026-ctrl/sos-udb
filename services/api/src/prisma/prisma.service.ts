import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // In test/dev environments, avoid forcing a DB connection.
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
