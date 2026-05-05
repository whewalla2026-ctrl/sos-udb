import { Module } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
@Module({ providers: [BiometricsService], exports: [BiometricsService] })
export class BiometricsModule {}
