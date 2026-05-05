import { Injectable } from '@nestjs/common';

@Injectable()
export class BiometricFlowService {
  calculateFlowWindow(current: any) {
    // naive: toggle based on biometric input
    const peak = current?.peak ?? 'morning';
    return { peak, window: 'light' };
  }
}
