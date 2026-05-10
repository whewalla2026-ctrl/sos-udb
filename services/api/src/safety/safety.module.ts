import { Module } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { SafetyResolver } from './safety.resolver';
import { PrismaModule } from '../prisma/prisma.module';
@Module({ imports: [PrismaModule], providers: [SafetyService, SafetyResolver], exports: [SafetyService] })
export class SafetyModule {}
