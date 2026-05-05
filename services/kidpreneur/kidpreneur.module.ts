import { Module } from '@nestjs/common';
import { KidPreneurService } from './kidpreneur.service';
@Module({ providers: [KidPreneurService], exports: [KidPreneurService] })
export class KidPreneurModule {}
