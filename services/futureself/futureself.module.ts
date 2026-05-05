import { Module } from '@nestjs/common';
import { FutureSelfService } from './futureself.service';
import { FutureselfController } from './futureself.controller';
@Module({ providers: [FutureSelfService], controllers: [FutureselfController], exports: [FutureSelfService] })
export class FutureSelfModule {}
