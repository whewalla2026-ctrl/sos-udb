import { Module } from '@nestjs/common';
import { AiLiteService } from './ai-lite.service';
import { AiLiteController } from './ai-lite.controller';
@Module({ providers: [AiLiteService], controllers: [AiLiteController], exports: [AiLiteService] })
export class AiLiteModule {}
