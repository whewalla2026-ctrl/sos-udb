import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UUPModule } from './uup/uup.module';
import { PlanningModule } from '../../planning/planning.module';
import { MonitoringModule } from '../../services/monitoring/monitoring.module';
import { AuthModule } from '../../services/auth/auth.module';
import { GraphQLAppModule } from './graphql.module';
import { AuditModule } from '../../services/audit/audit.module';
import { LmsModule } from '../../services/lms/lms.module';
import { AiLiteModule } from '../../services/ai-lite/ai-lite.module';
import { VectorStoreLocalModule } from '../../services/vector/vector-store-local.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    // Core Phase 1-2
    UUPModule,
    PlanningModule,
    AiLiteModule,
    MonitoringModule,
    AuthModule,
    AuditModule,
    LmsModule,
    VectorStoreLocalModule,
    GraphQLAppModule,
    // Distribution
    WaitlistModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
