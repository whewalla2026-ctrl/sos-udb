import { Module } from '@nestjs/common';
import { EntrepreneurshipService } from './entrepreneurship.service';
import { EntrepreneurshipResolver } from './entrepreneurship.resolver';
import { EscrowService } from './escrow.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [EntrepreneurshipService, EntrepreneurshipResolver, EscrowService],
  exports: [EntrepreneurshipService, EscrowService]
})
export class EntrepreneurshipModule {}
