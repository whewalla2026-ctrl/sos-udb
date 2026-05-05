import { Injectable } from '@nestjs/common';
@Injectable()
export class MonitoringService {
  ping() { return { ok: true }; }
}
