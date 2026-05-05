// Lightweight internal demonstration of Phase 1 flow using in-memory services
import { AuthService } from '../services/auth/auth.service';
import { UUPService } from '../services/api/src/uup/uup.service';
import { PlanningService } from '../services/planning/planning.service';
import { AuditService } from '../services/audit/audit.service';

async function demo() {
  console.log('Starting Phase 1 Demo...');

  const auth = new AuthService();
  const reg = auth.registerParent({ email: 'demo@phase1.local', password: 'DemoPhase1!', childName: 'Alex', childAge: 9 });
  console.log('Registered, consent token:', reg.consentToken);

  const consent = auth.verifyConsent(reg.email, reg.consentToken!);
  console.log('Consent result:', consent);

  const uup = new UUPService();
  const upsertPayload = {
    uup_data: {
      milestones: { academicQuests: 10, biometricQuests: 5 },
      gamification: { doter_state: 'egg' }
    }
  };
  const updated = uup.upsertUser(reg.parentId, upsertPayload);
  console.log('UUP updated', updated?.uup_data?.gamification?.doter_state);

  const planner = new PlanningService();
  const plan = planner.generateWeeklyPlan(['Math', 'Reading', 'Coding']);
  console.log('Generated plan:', plan);

  const audit = new AuditService();
  const log = audit.logEvent(reg.parentId, 'PHASE1_DEMO', { demo: true });
  console.log('Audit sample entry hash:', log?.ledgerHash);
}

demo().catch((e) => console.error('Demo error:', e));
