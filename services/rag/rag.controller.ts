import { Controller, Post, Body } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly rag: RagService) {}
  @Post('query')
  query(@Body() body: { query: string }) {
    return this.rag.query(body.query);
  }
}
