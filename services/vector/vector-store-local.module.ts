import { Module } from '@nestjs/common';
import { VectorStoreLocal } from './vector-store-local';
@Module({ providers: [{ provide: VectorStoreLocal, useClass: VectorStoreLocal }] , exports: [VectorStoreLocal] })
export class VectorStoreLocalModule {}
