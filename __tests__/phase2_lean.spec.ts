import { UUPService } from '../../services/api/src/uup/uup.service';
import { AiLiteService } from '../../services/ai-lite/ai-lite.service';
import { PlanningService } from '../../services/planning/planning.service';
import { VectorStoreLocal } from '../../services/vector/vector-store-local';

describe('Phase 2 Lean Path sanity', () => {
  test('basic lean flow initializes and can plan', async () => {
    // lean UUP path
    const uup = new UUPService();
    const res = uup.upsertUser('phase2-user', { uup_data: { academic: { lessons: [] } } });
    expect(res).toBeTruthy();
    // AI hint without latency concerns
    const ai = new AiLiteService();
    const hint = await ai.hint('phase2-user', 'What is 2+2?', '');
    expect(hint).toHaveProperty('hints');
  });
  test('vector local store basic add/query', () => {
    const vs = new VectorStoreLocal();
    vs.add('example', [1,2,3]);
    const r = vs.query([1,2,3]);
    expect(r.length).toBeGreaterThan(0);
  });
});
