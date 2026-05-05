import { Controller, Post, Body } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly rag: RagService) {}
  @Post('query')
  query(@Body() body: { query: string }) {
    return this.rag.query(body.query);
  }

  @Post('index')
  index(@Body() body: { id: string; text: string }) {
    return this.rag.indexDocument(body.id, body.text);
  }
}
