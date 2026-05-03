// ── Messaging Module ──────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingResolver } from './messaging.resolver';

@Module({ providers: [MessagingService, MessagingResolver], exports: [MessagingService] })
export class MessagingModule {}
