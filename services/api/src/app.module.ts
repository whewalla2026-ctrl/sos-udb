import { Module } from '@nestjs/common';
import { UUPModule } from './uup/uup.module';
import { PlanningModule } from '../../planning/planning.module';
import { EscrowModule } from '../../services/escrow/escrow.module';
import { NFTModule } from '../../services/nft/nft.module';
import { FutureSelfModule } from '../../services/futureself/futureself.module';
import { MonitoringModule } from '../../services/monitoring/monitoring.module';
import { AuthModule } from '../../services/auth/auth.module';
import { GraphQLAppModule } from './graphql.module';
import { AuditModule } from '../../services/audit/audit.module';
import { LmsModule } from '../../services/lms/lms.module';
import { AiMentorModule } from '../../services/aiMentor/aiMentor.module';
import { JoonWorldModule } from '../../services/joonworld/joonworld.module';
import { RagModule } from '../../services/rag/rag.module';
import { ModerationModule } from '../../services/moderation/moderation.module';
import { KidPreneurModule } from '../../services/kidpreneur/kidpreneur.module';
import { OmnichannelModule } from '../../services/omnichannel/omnichannel.module';
import { BiometricsModule } from '../../services/biometrics/biometrics.module';
import { WalletModule } from '../../services/wallet/wallet.module';
import { MarketplaceModule } from '../../services/marketplace/marketplace.module';
import { AiLifeCoachModule } from '../../services/aiLifeCoach/ai_life_coach.module';
import { GovernanceModule } from '../../services/governance/governance.module';
import { BiometricFlowModule } from '../../services/biometric/biometric_flow.module';

@Module({
  imports: [UUPModule, PlanningModule, EscrowModule, NFTModule, FutureSelfModule, MonitoringModule, AuthModule, GraphQLAppModule, AuditModule, LmsModule, AiMentorModule, JoonWorldModule, KidPreneurModule, OmnichannelModule, BiometricsModule, RagModule, ModerationModule, MarketplaceModule, WalletModule, AiLifeCoachModule, GovernanceModule, BiometricFlowModule],
})
export class AppModule {}
