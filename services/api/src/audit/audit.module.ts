import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditResolver } from './audit.resolver';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  providers: [AuditService, AuditResolver],
  exports: [AuditService],
})
export class AuditModule {}
