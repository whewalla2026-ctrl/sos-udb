// ── Messaging Module ──────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingResolver } from './messaging.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyModule } from '../safety/safety.module';

@Module({ imports: [PrismaModule, SafetyModule], providers: [MessagingService, MessagingResolver], exports: [MessagingService] })
export class MessagingModule {}
