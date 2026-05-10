import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceResolver } from './marketplace.resolver';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BlockchainModule, PrismaModule],
  providers: [MarketplaceService, MarketplaceResolver],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
