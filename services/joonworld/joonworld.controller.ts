import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { JoonWorldService } from './joonworld.service';

@Controller('joonworld')
export class JoonWorldController {
  constructor(private readonly jw: JoonWorldService) {}

  @Post('pod')
  createPod(@Body() body: { id: string; participants?: string[] }) {
    return this.jw.createStudyPod(body.id);
  }

  @Get('pods')
  listPods() {
    // Return a minimal example list
    return [{ id: 'pod-1', status: 'created' }];
  }
}
