import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditResolver } from './audit.resolver';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BlockchainModule, PrismaModule],
  providers: [AuditService, AuditResolver],
  exports: [AuditService],
})
export class AuditModule {}
