import { Module } from '@nestjs/common';
import { AiMentorService } from './aiMentor.service';
import { AiMentorController } from './aiMentor.controller';
@Module({ providers: [AiMentorService], controllers: [AiMentorController], exports: [AiMentorService] })
export class AiMentorModule {}
