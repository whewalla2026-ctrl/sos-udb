import { Module } from '@nestjs/common';
import { NFTService } from './nft.service';
import { NFTController } from './nft.controller';
@Module({ providers: [NFTService], controllers: [NFTController], exports: [NFTService] })
export class NFTModule {}
