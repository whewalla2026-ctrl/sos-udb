import { Controller, Post, Body } from '@nestjs/common';
import { VectorStoreLocal } from './vector-store-local';

@Controller('vector')
export class VectorStoreLocalController {
  constructor(private readonly vs: VectorStoreLocal) {}
  @Post('add')
  add(@Body() body: { key: string; vec: number[] }) {
    return this.vs.add(body.key, body.vec);
  }
  @Post('query')
  query(@Body() body: { vec: number[] }) {
    return this.vs.query(body.vec);
  }
}
