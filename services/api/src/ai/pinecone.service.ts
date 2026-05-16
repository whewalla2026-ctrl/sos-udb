import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import '@pinecone-database/pinecone';

export interface EmbeddingVector {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, string | number | boolean>;
}

@Injectable()
export class PineconeService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private index: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    const indexName = this.configService.get<string>('PINECONE_INDEX') || 'udb-vectors';

    if (!apiKey) {
      console.warn('Pinecone API key not configured - vector search will be disabled');
      return;
    }

    try {
      this.client = new (await import('@pinecone-database/pinecone')).Pinecone({
        apiKey,
      });
      this.index = this.client.Index(indexName);
    } catch (error) {
      console.error('Failed to initialize Pinecone client:', error);
    }
  }

  async onModuleDestroy() {
  }

  getNamespace(userId: string): string {
    return `user_${userId}`;
  }

  async upsertVectors(namespace: string, vectors: EmbeddingVector[]): Promise<void> {
    if (!this.index) {
      throw new Error('Pinecone not initialized');
    }

    await this.index.namespace(namespace).upsert({
      vectors: vectors.map(v => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata,
      })),
    });
  }

  async query(namespace: string, queryVector: number[], topK: number = 5, filter?: Record<string, any>): Promise<SearchResult[]> {
    if (!this.index) {
      throw new Error('Pinecone not initialized');
    }

    const response = await this.index.namespace(namespace).query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata: true,
    });

    return response.matches.map((match: any) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata,
    }));
  }

  async deleteNamespace(namespace: string): Promise<void> {
    if (!this.index) {
      throw new Error('Pinecone not initialized');
    }

    await this.index.namespace(namespace).deleteAll();
  }

  async deleteVector(namespace: string, ids: string[]): Promise<void> {
    if (!this.index) {
      throw new Error('Pinecone not initialized');
    }

    await this.index.namespace(namespace).deleteMany(ids);
  }

  isInitialized(): boolean {
    return !!this.index;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-3-small';

    if (!apiKey) {
      throw new Error('OpenAI API key not configured for embeddings');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate embedding: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async embedAndUpsert(userId: string, content: string, docId: string, metadata: Record<string, any> = {}): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    const namespace = this.getNamespace(userId);

    await this.upsertVectors(namespace, [{
      id: docId,
      values: embedding,
      metadata: {
        ...metadata,
        content: content.substring(0, 1000),
        timestamp: new Date().toISOString(),
      },
    }]);
  }

  async semanticSearch(userId: string, query: string, topK: number = 5, filter?: Record<string, any>): Promise<SearchResult[]> {
    const embedding = await this.generateEmbedding(query);
    const namespace = this.getNamespace(userId);

    return this.query(namespace, embedding, topK, filter);
  }
}