import { Controller, Get, Post, Body } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly market: MarketplaceService) {}

  @Get('ventures')
  ventures() {
    return this.market.list();
  }

  @Post('venture')
  create(@Body() body: { owner: string; title: string; price: number }) {
    return this.market.create(body as any);
  }

  @Post('purchase')
  purchase(@Body() body: { ventureId: string; buyer: string }) {
    return this.market.purchase(body.ventureId, body.buyer);
  }
}
