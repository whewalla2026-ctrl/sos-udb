import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { AgentService, AgentHeartbeat } from './agent.service';
import { FeatureFlagService } from '../feature-flags/feature-flags.service';

@Controller('agent')
export class AgentController {
  constructor(
    private agent: AgentService,
    private featureFlags: FeatureFlagService,
  ) {}

  @Post('heartbeat')
  async receiveHeartbeat(
    @Body() heartbeat: AgentHeartbeat,
    @Headers('x-user-id') userId: string,
  ) {
    const enabled = await this.featureFlags.isEnabled('desktop-agent');
    
    if (!enabled) {
      await this.agent.receiveHeartbeatFallback(userId, heartbeat.focusScore);
      return { mode: 'fallback', message: 'Using in-platform activity data' };
    }

    await this.agent.receiveHeartbeat(heartbeat, userId);
    return { mode: 'full', message: 'Desktop agent active' };
  }

  @Post('register')
  async register(
    @Body() body: { platform: string; version: string },
    @Headers('x-user-id') userId: string,
  ) {
    await this.agent.registerAgent(userId, body.platform, body.version);
    return { success: true };
  }
}