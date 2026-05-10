import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Registry, collectDefaultMetrics } from 'prom-client';

@Controller()
export class MetricsController {
  private readonly registry: Registry;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry, prefix: 'udb_' });
  }

  @Get('metrics')
  async metrics(@Res() res: Response) {
    const metrics = await this.registry.metrics();
    res.setHeader('Content-Type', this.registry.contentType);
    res.send(metrics);
  }
}
