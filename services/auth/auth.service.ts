import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConsentService } from '../consent/consent.service';

type ChildProfile = { id: string; name: string; age: number };
type ParentProfile = { id: string; email: string };

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  parent?: ParentProfile;
  child?: ChildProfile;
  consentToken?: string;
  verified?: boolean;
}

@Injectable()
export class AuthService {
  private users: Record<string, UserRecord> = {};
  // We enable a simple in-memory mapping to a consent service; initialization will occur via DI in a real app
  constructor() {
    // no-op for now; Consent wiring is handled in Guardian flow
  }

  private hash(pw: string): string {
    // Minimal placeholder hash (do not use in production)
    return Buffer.from(pw).toString('base64');
  }

  registerParent(data: { email: string; password: string; parentName?: string; childName: string; childAge: number; }) {
    const id = `u-${randomBytes(4).toString('hex')}`;
    const parentId = `${id}-p`;
    const childId = `${id}-c`;
    const consentToken = this.generateConsentToken();
    this.users[data.email] = {
      id,
      email: data.email,
      passwordHash: this.hash(data.password),
      parent: { id: parentId, email: data.email },
      child: { id: childId, name: data.childName, age: data.childAge },
      consentToken,
      verified: false,
    };
    return { consentToken, parentId, childId };
  }

  verifyConsent(email: string, token: string) {
    const user = this.users[email];
    if (user && user.consentToken === token) {
      user.verified = true;
      return { token: this.generateAuthToken(user.id) };
    }
    return { error: 'Invalid consent token' };
  }

  private generateConsentToken() {
    return randomBytes(16).toString('hex');
  }

  private generateAuthToken(userId: string) {
    // Simple token for demo; replace with real JWT in production
    const payload = JSON.stringify({ uid: userId, ts: Date.now() });
    return Buffer.from(payload).toString('base64');
  }
}
