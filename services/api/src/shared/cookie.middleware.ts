import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CookieMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      req.cookies = Object.fromEntries(
        cookieHeader.split(';').map(pair => {
          const [key, ...rest] = pair.trim().split('=');
          return [key, decodeURIComponent(rest.join('='))];
        }),
      );
    } else {
      req.cookies = {};
    }
    next();
  }
}
