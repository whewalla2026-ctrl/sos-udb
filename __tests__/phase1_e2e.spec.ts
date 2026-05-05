import { AuthService } from '../services/auth/auth.service';
import { UUPService } from '../services/api/src/uup/uup.service';
process.env.UDB_USE_INMEMORY = 'true';
import { PlanningService } from '../services/planning/planning.service';
import { AuditService } from '../services/audit/audit.service';

describe('Phase 1 End-to-End Basic Flow', () => {
  it('runs through registration, consent, UUP evolution, and planning', () => {
    const auth = new AuthService();
    const reg = auth.registerParent({ email: 'e2e@example.com', password: 'Secret123!', childName: 'Alex', childAge: 8 });
    expect(reg).toHaveProperty('consentToken');

    const consent = auth.verifyConsent(reg.email, reg.consentToken!);
    // consent returns a token or error
    expect(consent).toHaveProperty('token');

    const uup = new UUPService();
    const upsertPayload = {
      uup_data: {
        milestones: { academicQuests: 10, biometricQuests: 5 },
        gamification: { doter_state: 'egg' }
      }
    };
    const updated = uup.upsertUser(reg.parentId, upsertPayload);
    expect(updated.uup_data.gamification.doter_state).toBe('juvenile');

    const planner = new PlanningService();
    const plan = planner.generateWeeklyPlan(['Math', 'Reading', 'Coding']);
    expect(plan).toBeInstanceOf(Array);
    expect(plan.length).toBeGreaterThan(0);
  });
  it('records an audit event and writes to immutable ledger', () => {
    const audit = new AuditService();
    const rec = audit.logEvent('test-user', 'PHASE1_DEMO', { demo: true });
    // ledgerHash should be present due to ledger path in AuditService
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(rec).toHaveProperty('ledgerHash');
  });
});
