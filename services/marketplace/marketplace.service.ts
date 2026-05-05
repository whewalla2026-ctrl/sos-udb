import { Injectable } from '@nestjs/common';

type Venture = { id: string; owner: string; title: string; price: number; status: string };

@Injectable()
export class MarketplaceService {
  private ventures: Venture[] = [];
  list() {
    return this.ventures;
  }
  create(v: Partial<Venture>) {
    const venture: Venture = {
      id: v.id ?? `venture_${Date.now()}`,
      owner: v.owner ?? 'unknown',
      title: v.title ?? 'Untitled Venture',
      price: v.price ?? 0,
      status: v.status ?? 'OPEN',
    } as Venture;
    this.ventures.push(venture);
    return venture;
  }
  purchase(ventureId: string, buyer: string) {
    const v = this.ventures.find((x) => x.id === ventureId);
    if (!v) return null;
    v.status = 'COMPLETED';
    return { venture: v, buyer };
  }
}
