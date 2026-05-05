import { AuthService } from '../services/auth/auth.service';
 

describe('Auth Phase 1 - Guardian Consent', () => {
  it('registers a parent and initiates consent token', () => {
    const svc = new AuthService();
    const res = svc.registerParent({ email: 'test@example.com', password: 'StrongPass123!', childName: 'Alex', childAge: 10 });
    expect(res).toHaveProperty('consentToken');
  });
  it('verifies consent token and returns auth token', () => {
    const svc = new AuthService();
    const reg = svc.registerParent({ email: 'consent@example.com', password: 'Pwd123!', childName: 'Sam', childAge: 11 });
    const verify = svc.verifyConsent(reg.email, reg.consentToken!);
    // verifyConsent returns token on success
    expect(verify).toHaveProperty('token');
  });
});
