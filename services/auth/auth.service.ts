import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConsentService } from '../consent/consent.service';

type ChildProfile = { id: string; name: string; age: number };
type ParentProfile = { id: string; email: string };

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  parent?: ParentProfile;
  child?: ChildProfile;
  consentToken?: string;
  verified?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private users: Record<string, UserRecord> = {};

  constructor(
    private readonly jwt: JwtService,
  ) {}

  private hash(pw: string, salt: string): string {
    return scryptSync(pw, salt, 64).toString('hex');
  }

  registerParent(data: { email: string; password: string; parentName?: string; childName: string; childAge: number; }) {
    const id = `u-${randomBytes(4).toString('hex')}`;
    const parentId = `${id}-p`;
    const childId = `${id}-c`;
    const salt = randomBytes(16).toString('hex');
    const consentToken = randomBytes(16).toString('hex');
    this.users[data.email] = {
      id,
      email: data.email,
      passwordHash: this.hash(data.password, salt),
      salt,
      parent: { id: parentId, email: data.email },
      child: { id: childId, name: data.childName, age: data.childAge },
      consentToken,
      verified: false,
    };
    this.logger.log(`User registered: ${data.email}`);
    return { consentToken, parentId, childId };
  }

  async login(email: string, password: string) {
    const user = this.users[email];
    if (!user) {
      return { error: 'Invalid credentials' };
    }
    const hash = this.hash(password, user.salt);
    const buf1 = Buffer.from(hash, 'hex');
    const buf2 = Buffer.from(user.passwordHash, 'hex');
    if (buf1.length !== buf2.length || !timingSafeEqual(buf1, buf2)) {
      return { error: 'Invalid credentials' };
    }
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '7d' },
    );
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' },
    );
    return { accessToken, refreshToken, userId: user.id };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      if (payload.type !== 'refresh') {
        return { error: 'Invalid token type' };
      }
      const accessToken = this.jwt.sign(
        { sub: payload.sub, email: payload.email },
        { expiresIn: '7d' },
      );
      return { accessToken };
    } catch {
      return { error: 'Invalid or expired refresh token' };
    }
  }

  verifyConsent(email: string, token: string) {
    const user = this.users[email];
    if (user && user.consentToken === token) {
      user.verified = true;
      const accessToken = this.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '7d' },
      );
      this.logger.log(`Consent verified for: ${email}`);
      return { token: accessToken };
    }
    this.logger.warn(`Invalid consent attempt for: ${email}`);
    return { error: 'Invalid consent token' };
  }

  validateToken(token: string) {
    try {
      return this.jwt.verify(token);
    } catch {
      return null;
    }
  }
}
