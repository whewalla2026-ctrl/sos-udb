import { Controller, Get, Query } from '@nestjs/common';
import { FutureSelfService } from './futureself.service';

@Controller('future-self')
export class FutureselfController {
  constructor(private readonly svc: FutureSelfService) {}

  @Get()
  simulate(@Query('userId') userId: string) {
    return this.svc.simulate({ id: userId });
  }
}
