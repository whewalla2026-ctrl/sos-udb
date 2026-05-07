import { Module } from '@nestjs/common';
import { CostGuardService } from './cost_guard.service';
@Module({ providers: [CostGuardService], exports: [CostGuardService] })
export class CostGuardModule {}
