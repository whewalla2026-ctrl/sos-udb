import { Module } from '@nestjs/common';
import { EntrepreneurshipService } from './entrepreneurship.service';
import { EntrepreneurshipResolver } from './entrepreneurship.resolver';
import { EscrowService } from './escrow.service';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AiModule, PrismaModule],
  providers: [EntrepreneurshipService, EntrepreneurshipResolver, EscrowService],
  exports: [EntrepreneurshipService, EscrowService]
})
export class EntrepreneurshipModule {}
