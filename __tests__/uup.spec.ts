import { UUPService } from '../services/api/src/uup/uup.service';
process.env.UDB_USE_INMEMORY = 'true';

describe('UUP Phase 1 Evolution', () => {
  test('evolves Doter to juvenile when milestones met', () => {
    const svc = new UUPService();
    const userId = 'test-user-1';
    const payload = {
      uup_data: {
        milestones: {
          academicQuests: 10,
          biometricQuests: 5
        },
        gamification: { doter_state: 'egg' }
      }
    };
    const res = (svc as any).upsertUser(userId, payload);
    expect(res.uup_data.gamification.doter_state).toBe('juvenile');
  });
});
