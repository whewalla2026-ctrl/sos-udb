import { Module } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { GovernanceController } from './governance.controller';

@Module({ providers: [GovernanceService], controllers: [GovernanceController], exports: [GovernanceService] })
export class GovernanceModule {}
