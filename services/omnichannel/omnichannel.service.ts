import { Injectable } from '@nestjs/common';
@Injectable()
export class OmnichannelService {
  monitorAll(userId: string) {
    return { userId, status: 'monitored' };
  }
}
