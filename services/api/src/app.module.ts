import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FamilyModule } from './family/family.module';
import { DoterModule } from './doter/doter.module';
import { QuestsModule } from './quests/quests.module';
import { PointsModule } from './points/points.module';
import { GoalsModule } from './goals/goals.module';
import { ActivitiesModule } from './activities/activities.module';
import { BiometricModule } from './biometric/biometric.module';
import { UupSyncModule } from './uup-sync/uup-sync.module';
import { AcademicModule } from './academic/academic.module';
import { MessagingModule } from './messaging/messaging.module';
import { EvidenceModule } from './evidence/evidence.module';
import { EntrepreneurshipModule } from './entrepreneurship/entrepreneurship.module';
import { SafetyModule } from './safety/safety.module';
import { WeeklyPlanModule } from './weekly-plan/weekly-plan.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AiModule } from './ai/ai.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MetricsModule } from './shared/metrics.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      context: ({ req }) => ({ req }),
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    FamilyModule,
    DoterModule,
    QuestsModule,
    PointsModule,
    GoalsModule,
    ActivitiesModule,
    BiometricModule,
    UupSyncModule,
    AcademicModule,
    MessagingModule,
    EvidenceModule,
    EntrepreneurshipModule,
    SafetyModule,
    WeeklyPlanModule,
    NotificationsModule,
    AuditModule,
    AiModule,
    BlockchainModule,
    MarketplaceModule,
    OnboardingModule,
    AnalyticsModule,
    MonitoringModule,
    MetricsModule,
  ],
})
export class AppModule {}
