import { LmsSyncService } from '../../services/lms/lms-sync.service';
import { RagService } from '../../services/rag/rag.service';
import { AiMentorService } from '../../services/aiMentor/aiMentor.service';
import { PlanningService } from '../../services/planning/planning.service';
import { AuthService } from '../../services/auth/auth.service';

describe('Phase 2 E2E (scaffold)', () => {
  test('LMS ingest and aggregate path + tutor path', () => {
    const lms = new LmsSyncService();
    const user = 'user-2';
    lms.sync(user, { provider: 'Canvas', assignments: [] });
    const agg = lms.fetchAggregated ? lms.fetchAggregated(user) : null;
    expect(agg).toBeTruthy();
  });

  test('Socratic tutor scaffolding returns hints', () => {
    const mentor = new AiMentorService();
    const res = mentor.scaffoldPrompt('context', 'What is 2+2?');
    expect(typeof res).toBe('string');
  });
});
