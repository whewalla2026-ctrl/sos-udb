import { z } from 'zod';

export const UUPSchemaV4 = z.object({
  version: z.literal('v4.0'),
  userId: z.string().uuid(),
  demographics: z.object({
    age: z.number().int().min(6).max(23),
    timezone: z.string(),
    grade: z.number().int().min(1).max(16).optional(),
    locale: z.string().default('en-US'),
  }),
  accessibility: z.object({
    dyslexiaMode: z.boolean().default(false),
    ttsEnabled: z.boolean().default(false),
    highContrast: z.boolean().default(false),
    reducedMotion: z.boolean().default(false),
    lastSync: z.string().datetime().optional(),
  }),
  academic: z.object({
    math_rit: z.number().optional(),
    reading_rit: z.number().optional(),
    lms_sync_status: z.enum(['active', 'pending', 'disconnected', 'error']).default('disconnected'),
    workload_forecast: z.number().min(0).max(1).optional(),
    subjects: z.array(z.object({
      name: z.string(),
      grade: z.string().optional(),
      lastUpdated: z.string().datetime(),
    })).default([]),
  }),
  biometric: z.object({
    avg_sleep_hours: z.number().min(0).max(14).optional(),
    stress_index: z.number().min(0).max(1).optional(),
    chronotype: z.enum(['morning_logic', 'afternoon_creative', 'evening_social', 'neutral']).default('neutral'),
    last_sync: z.string().datetime().optional(),
    hrv_baseline: z.number().optional(),
  }),
  gamification: z.object({
    doter_level: z.number().int().min(1).default(1),
    doter_state: z.enum(['ENERGETIC', 'NEUTRAL', 'SLUGGISH', 'EVOLVING', 'RESTING']).default('NEUTRAL'),
    coin_balance: z.number().int().min(0).default(0),
    xp: z.number().int().min(0).default(0),
    active_streaks: z.number().int().min(0).default(0),
    streak_freeze_available: z.number().int().min(0).max(3).default(0),
    last_streak_freeze_auto: z.string().datetime().optional(),
  }),
  entrepreneurship: z.object({
    active_projects: z.number().int().min(0).default(0),
    total_revenue_usd: z.number().min(0).default(0),
    reputation_score: z.number().min(0).max(1).default(0),
    escrow_balance_usd: z.number().min(0).default(0),
  }),
  social: z.object({
    pod_memberships: z.array(z.string().uuid()).default([]),
    sbt_count: z.number().int().min(0).default(0),
    messaging_enabled: z.boolean().default(false),
  }),
  future_ready: z.object({
    blockchain_wallet: z.string().optional(),
    ai_proxy_access: z.boolean().default(false),
    last_simulation: z.string().datetime().optional(),
  }),
  metadata: z.object({
    last_updated: z.string().datetime(),
    schema_version: z.literal('v4.0'),
    conflict_resolution_priority: z.literal('PARENT > AI > SYSTEM'),
    vpc_status: z.enum(['verified', 'pending', 'rejected', 'not_required']).default('not_required'),
  }),
});

export type UUP = z.infer<typeof UUPSchemaV4>;

export const UUPDemographicsSchema = UUPSchemaV4.shape.demographics;
export const UUPAccessibilitySchema = UUPSchemaV4.shape.accessibility;
export const UUPAcademicSchema = UUPSchemaV4.shape.academic;
export const UUPBiometricSchema = UUPSchemaV4.shape.biometric;
export const UUPGamificationSchema = UUPSchemaV4.shape.gamification;
export const UUPEntrepreneurshipSchema = UUPSchemaV4.shape.entrepreneurship;
export const UUPSocialSchema = UUPSchemaV4.shape.social;
export const UUPFutureReadySchema = UUPSchemaV4.shape.future_ready;

export function createDefaultUUP(userId: string, age: number): UUP {
  return {
    version: 'v4.0',
    userId,
    demographics: {
      age,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      grade: undefined,
      locale: 'en-US',
    },
    accessibility: {
      dyslexiaMode: false,
      ttsEnabled: false,
      highContrast: false,
      reducedMotion: false,
      lastSync: undefined,
    },
    academic: {
      math_rit: undefined,
      reading_rit: undefined,
      lms_sync_status: 'disconnected',
      workload_forecast: undefined,
      subjects: [],
    },
    biometric: {
      avg_sleep_hours: undefined,
      stress_index: undefined,
      chronotype: 'neutral',
      last_sync: undefined,
      hrv_baseline: undefined,
    },
    gamification: {
      doter_level: 1,
      doter_state: 'NEUTRAL',
      coin_balance: 0,
      xp: 0,
      active_streaks: 0,
      streak_freeze_available: 0,
      last_streak_freeze_auto: undefined,
    },
    entrepreneurship: {
      active_projects: 0,
      total_revenue_usd: 0,
      reputation_score: 0,
      escrow_balance_usd: 0,
    },
    social: {
      pod_memberships: [],
      sbt_count: 0,
      messaging_enabled: false,
    },
    future_ready: {
      blockchain_wallet: undefined,
      ai_proxy_access: false,
      last_simulation: undefined,
    },
    metadata: {
      last_updated: new Date().toISOString(),
      schema_version: 'v4.0',
      conflict_resolution_priority: 'PARENT > AI > SYSTEM',
      vpc_status: age < 13 ? 'pending' : 'not_required',
    },
  };
}

export function validateUUPPartial(data: unknown): Partial<UUP> {
  return UUPSchemaV4.partial().parse(data);
}

export function validateUUP(data: unknown): UUP {
  return UUPSchemaV4.parse(data);
}