import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLedger } from '../../audit-ledger/audit-ledger';

@Module({
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {
  constructor() {
    // Ensure ledger directory exists if needed; no runtime action required here
  }
}
