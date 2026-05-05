import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConsentService } from '../consent/consent.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly consent: ConsentService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; childName: string; childAge: number }) {
    const res = this.auth.registerParent({
      email: body.email,
      password: body.password,
      childName: body.childName,
      childAge: body.childAge
    });
    // Return a consent token from the auth flow partner (for demo)
    return res;
  }

  @Post('verify')
  async verify(@Body() body: { email: string; token: string, userId?: string }) {
    const v = this.auth.verifyConsent(body.email, body.token);
    // If consent token is valid, grant consent via ConsentService (mock)
    if ((v as any).token) {
      const userId = body.userId ?? body.email; // simple mapping for demo
      await this.consent.grant(userId);
      return v;
    }
    return v;
  }
}
