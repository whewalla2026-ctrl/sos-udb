import { Module } from '@nestjs/common';
import { OmnichannelService } from './omnichannel.service';
@Module({ providers: [OmnichannelService], exports: [OmnichannelService] })
export class OmnichannelModule {}
