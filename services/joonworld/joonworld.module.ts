import { Module } from '@nestjs/common';
import { JoonWorldService } from './joonworld.service';
import { JoonWorldController } from './joonworld.controller';
@Module({ providers: [JoonWorldService], controllers: [JoonWorldController], exports: [JoonWorldService] })
export class JoonWorldModule {}
