import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post('link/:userId')
  link(@Param('userId') userId: string, @Body() body: { address: string }) {
    return this.wallet.link(userId, body.address);
  }

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.wallet.get(userId);
  }
}
