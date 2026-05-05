import { Injectable } from '@nestjs/common';

interface LmsContext { [key: string]: any; }

type ProviderName = 'Canvas' | 'GoogleClassroom' | 'Moodle';

@Injectable()
export class LmsSyncService {
  private cache: Record<string, LmsContext> = {};
  private providerData: Record<ProviderName, any> = {
    Canvas: { assignments: [], course: 'DemoCanvas' },
    GoogleClassroom: { assignments: [], course: 'DemoGClass' },
    Moodle: { assignments: [], course: 'DemoMoodle' },
  };

  // Simple provider switcher (mock implementation)
  private fetchFromProvider(provider: ProviderName, userId: string) {
    // In a real system, we'd talk to the provider's API with OAuth tokens.
    // Here we return a synthetic payload representing assignments.
    const base = this.providerData[provider] ?? {};
    return {
      userId,
      provider,
      assignments: [
        { id: `${provider}-A1`, title: `Sample ${provider} Assignment 1`, due: new Date().toISOString() },
        { id: `${provider}-A2`, title: `Sample ${provider} Assignment 2`, due: new Date().toISOString() }
      ],
      ...base
    };
  }

  // Upsert a synthesized LMS context for a user by aggregating providers
  async sync(userId: string, context: any) {
    // Accept context from one provider; attach aggregated view if needed
    const merged = { ...(this.cache[userId] || {}), ...context } as LmsContext;
    this.cache[userId] = merged;
    // Simple propagation: store in a dedicated field to reflect Phase 2 integration path
    if (!this.cache[userId].lms_sync_context) {
      this.cache[userId].lms_sync_context = {};
    }
    Object.assign(this.cache[userId].lms_sync_context, context || {});
    // In a production path, we would push this into UUP via a sync API; mocked here for gating
    return this.cache[userId];
  }

  // Public: fetch aggregated LMS context across major providers (mock)
  fetchAggregated(userId: string) {
    const canv = this.fetchFromProvider('Canvas', userId);
    const gclass = this.fetchFromProvider('GoogleClassroom', userId);
    const moodle = this.fetchFromProvider('Moodle', userId);
    return {
      userId,
      aggregated: {
        Canvas: canv.assignments,
        GoogleClassroom: gclass.assignments,
        Moodle: moodle.assignments,
      }
    };
  }

  // Attempt to propagate LMS context into the Unified User Profile (Phase 2 integration)
  private async propagateLMSToUUP(userId: string, lmsContext: any) {
    // In-memory path: embed into UUP under uup_data.lms_sync_context
    if (!this.cache[userId]) return;
    const existing = this.cache[userId];
    const merged = { ...existing, lms_sync_context: lmsContext };
    this.cache[userId] = merged;
    // If DB mode, attempt a best-effort update (no strict schema involved yet)
    // Best effort: no-op if Prisma not wired for this exact structure in Phase 2 scaffold
    try {
      // Lazy require to avoid circular imports in build mode
      const { UUPService } = require('../api/src/uup/uup.service');
      // If a real UUPService exists as a class, we'd call upsertUser; skip complex wiring here for stability
    } catch {
      // swallow in non-prod builds
    }
  }
}
