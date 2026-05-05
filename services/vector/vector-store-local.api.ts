// Simple facade for vector search usage by other services
export class VectorStoreLocalApi {
  private store = new (require('./vector-store-local').VectorStoreLocal)();
  add(key: string, vec: number[]) { return this.store.add(key, vec); }
  query(vec: number[]) { return this.store.query(vec); }
}
