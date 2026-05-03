import { Module } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { SafetyResolver } from './safety.resolver';
@Module({ providers: [SafetyService, SafetyResolver], exports: [SafetyService] })
export class SafetyModule {}
