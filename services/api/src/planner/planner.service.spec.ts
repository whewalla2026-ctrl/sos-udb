import { Test, TestingModule } from '@nestjs/testing';
import { PlannerService } from './planner.service';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockUUP = (overrides: any = {}) => ({
  biometric: { avg_sleep_hours: 7, stress_index: 0.3, hrv_baseline: 65, chronotype: 'neutral', last_sync: null, ...overrides.biometric },
  academic: { math_rit: 0, reading_rit: 0, lms_sync_status: 'pending', skill_gaps: {}, workload_forecast: 0, ...overrides.academic },
  gamification: { doter_state: 'NEUTRAL', doter_level: 1, xp: 0, coin_balance: 0, active_streaks: 0, streak_freeze_available: 0, ...overrides.gamification },
  entrepreneurship: { active_projects: [], total_revenue_usd: 0, wallet_balance: 0, ...overrides.entrepreneurship },
  metadata: { blockchain_wallet: null, coppa_consent: false, last_updated: new Date().toISOString(), ...overrides.metadata },
});

describe('PlannerService', () => {
  let service: PlannerService;

  const mockPrisma = {};

  const mockUupSync = {
    getUUP: jest.fn(),
    sync: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UUPSyncService, useValue: mockUupSync },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PlannerService>(PlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDraft', () => {
    it('should create planner draft with slots for a week', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ biometric: { chronotype: 'neutral' } }));

      const draft = await service.generateDraft('user-1', '2026-05-25');

      expect(draft).toBeDefined();
      expect(draft.slots).toBeDefined();
      expect(draft.slots.length).toBeGreaterThan(0);
      expect(draft.status).toBe('DRAFT');
      expect(draft.weekStart).toBe('2026-05-25');
    });

    it('should schedule cognitive blocks at chronotype peak times for morning_logic', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ biometric: { chronotype: 'morning_logic' } }));

      const draft = await service.generateDraft('user-1', '2026-05-25');

      const cognitiveSlots = draft.slots.filter(s => s.activityType === 'cognitive');
      expect(cognitiveSlots.length).toBeGreaterThan(0);
      const startTimes = cognitiveSlots.map(s => s.startTime);
      expect(startTimes).toContain('09:00');
      expect(startTimes).toContain('10:30');
    });

    it('should detect time overlap conflicts', async () => {
      mockUupSync.getUUP.mockResolvedValue(mockUUP({ biometric: { chronotype: 'neutral' } }));

      const draft = await service.generateDraft('user-1', '2026-05-25');

      const timeOverlaps = draft.conflicts.filter(c => c.type === 'TIME_OVERLAP');
      expect(timeOverlaps.length).toBeGreaterThan(0);
    });

    it('should detect screen limit conflicts (>3 screen blocks)', async () => {
      const day = 0;
      const manyScreenSlots = Array.from({ length: 5 }, (_, i) => ({
        id: `screen-${i}`,
        day,
        startTime: `${8 + i}:00`,
        endTime: `${9 + i}:00`,
        activityType: 'screen',
        title: 'Screen Time',
        explanation: '',
        goalMappings: [],
        isLocked: false,
      }));
      const result = (service as any).detectConflicts(manyScreenSlots);
      const screenLimits = result.filter((c: any) => c.type === 'SCREEN_LIMIT');
      expect(screenLimits.length).toBeGreaterThan(0);
      expect(screenLimits[0].type).toBe('SCREEN_LIMIT');
    });
  });

  describe('approveDraft', () => {
    it('should return approved draft', async () => {
      const result = await service.approveDraft('draft-1');

      expect(result.status).toBe('APPROVED');
      expect(result.id).toBe('draft-1');
    });
  });

  describe('getChronotypeSchedule', () => {
    it('should return neutral schedule for unknown chronotype', () => {
      const schedule = (service as any).getChronotypeSchedule('unknown');
      expect(schedule).toEqual({ cognitive: ['09:00', '14:00'], creative: ['11:00', '15:00'] });
    });
  });
});
