import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.controller';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const path = req.route?.path || req.path || req.originalUrl || 'unknown';
      this.metrics.httpRequestsTotal.inc({
        method: req.method,
        path,
        status: String(res.statusCode),
      });
      this.metrics.httpRequestDuration.observe({
        method: req.method,
        path,
      }, duration);
    });

    next();
  }
}
