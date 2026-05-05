import { Module } from '@nestjs/common';
import { BiometricService } from './biometric.service';
import { BiometricResolver } from './biometric.resolver';
import { UupSyncModule } from '../uup-sync/uup-sync.module';
import { PrismaModule } from '../prisma/prisma.module';
@Module({ imports: [UupSyncModule, PrismaModule], providers: [BiometricService, BiometricResolver], exports: [BiometricService] })
export class BiometricModule {}
