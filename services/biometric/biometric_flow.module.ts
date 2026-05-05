import { Module } from '@nestjs/common';
import { BiometricFlowService } from './biometric_flow.service';
import { BiometricFlowController } from './biometric_flow.controller';

@Module({ providers: [BiometricFlowService], controllers: [BiometricFlowController], exports: [BiometricFlowService] })
export class BiometricFlowModule {}
