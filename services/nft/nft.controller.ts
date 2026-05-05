import { Controller, Post, Body, Param } from '@nestjs/common';
import { NFTService } from './nft.service';

@Controller('nft')
export class NFTController {
  constructor(private readonly nft: NFTService) {}
  @Post('mint/:userId')
  mint(@Param('userId') userId: string, @Body() body: { label: string }) {
    return this.nft.mint(userId, body.label);
  }
}
