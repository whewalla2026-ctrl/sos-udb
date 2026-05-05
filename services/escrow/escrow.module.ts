import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';

@Module({
  providers: [EscrowService],
  controllers: [EscrowController],
})
export class EscrowModule {}
