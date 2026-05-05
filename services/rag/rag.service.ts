import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  private documents: Array<{ id: string; text: string }> = [];
  indexDocument(id: string, text: string) {
    this.documents.push({ id, text });
  }
  query(query: string) {
    const faultRate = parseFloat(process.env.VECTOR_FAIL_RATE || '0');
    if (faultRate > 0 && Math.random() < faultRate) {
      throw new Error('Simulated vector store failure');
    }
    const hits = this.documents.filter((d) => d.text.toLowerCase().includes(query.toLowerCase()));
    return { results: hits };
  }
}
