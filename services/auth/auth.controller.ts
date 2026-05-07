import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConsentService } from '../consent/consent.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly consent: ConsentService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() body: { email: string; password: string; childName: string; childAge: number }) {
    if (!body.email || !body.email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }
    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!body.childName || body.childName.length < 1) {
      throw new BadRequestException('Child name is required');
    }
    if (!body.childAge || body.childAge < 3 || body.childAge > 23) {
      throw new BadRequestException('Child age must be between 3 and 23');
    }
    const res = this.auth.registerParent({
      email: body.email.toLowerCase().trim(),
      password: body.password,
      childName: body.childName.trim(),
      childAge: body.childAge
    });
    return res;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }
    const result = await this.auth.login(body.email.toLowerCase().trim(), body.password);
    if (result.error) {
      throw new BadRequestException(result.error);
    }
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    const result = await this.auth.refresh(body.refreshToken);
    if (result.error) {
      throw new BadRequestException(result.error);
    }
    return result;
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() body: { email: string; token: string; userId?: string }) {
    if (!body.email || !body.token) {
      throw new BadRequestException('Email and token are required');
    }
    const v = this.auth.verifyConsent(body.email.toLowerCase().trim(), body.token);
    if ((v as any).token) {
      const userId = body.userId ?? body.email;
      await this.consent.grant(userId);
      return v;
    }
    return v;
  }
}
