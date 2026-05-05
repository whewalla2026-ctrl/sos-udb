// Minimal local in-memory vector store for Phase 2 lean path
export class VectorStoreLocal {
  private store: Map<string, number[]> = new Map();
  add(key: string, vec: number[]) {
    this.store.set(key, vec);
  }
  query(vec: number[]): { key: string; score: number }[] {
    const results: { key: string; score: number }[] = [];
    for (const [k, v] of this.store.entries()) {
      const score = this.cosine(vec, v);
      results.push({ key: k, score });
    }
    return results.sort((a, b) => b.score - a.score);
  }
  private cosine(a: number[], b: number[]) {
    const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
    const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
    if (na === 0 || nb === 0) return 0;
    return dot / (na * nb);
  }
}
