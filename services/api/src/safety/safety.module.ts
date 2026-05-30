import { Module } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { SafetyResolver } from './safety.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';
@Module({ imports: [PrismaModule, UUPSyncModule], providers: [SafetyService, SafetyResolver], exports: [SafetyService] })
export class SafetyModule {}
