import { Injectable } from '@nestjs/common';

type WalletRecord = { userId: string; address: string };

@Injectable()
export class WalletService {
  private wallets: WalletRecord[] = [];
  link(userId: string, address: string) {
    const w = { userId, address };
    this.wallets.push(w);
    return w;
  }
  get(userId: string) {
    return this.wallets.find((w) => w.userId === userId) ?? null;
  }
}
