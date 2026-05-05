import { Injectable } from '@nestjs/common';

type EscrowState = 'HELD' | 'PROOF_SUBMITTED' | 'PARENT_REVIEW' | 'RELEASED';

@Injectable()
export class EscrowService {
  private escrows: Record<string, { amount: number; state: EscrowState; proof?: string }> = {};

  createEscrow(id: string, amount: number) {
    this.escrows[id] = { amount, state: 'HELD' };
    return this.escrows[id];
  }

  submitProof(id: string, proof: string) {
    if (!this.escrows[id]) return null;
    this.escrows[id].state = 'PROOF_SUBMITTED';
    this.escrows[id].proof = proof;
    return this.escrows[id];
  }

  approve(id: string) {
    if (!this.escrows[id]) return null;
    this.escrows[id].state = 'RELEASED';
    return this.escrows[id];
  }

  release(id: string) {
    if (!this.escrows[id]) return { id, state: 'RELEASED' };
    this.escrows[id].state = 'RELEASED';
    return this.escrows[id];
  }
}
