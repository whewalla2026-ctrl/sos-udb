import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  private index: Record<string, string[]> = {};
  indexDocument(id: string, text: string) {
    // naive indexing by id
    this.index[id] = [text];
  }
  query(query: string) {
    // naive respond with the last indexed snippet
    const keys = Object.keys(this.index);
    if (!keys.length) return { results: [] };
    return { results: this.index[keys[0]] || [] };
  }
}
