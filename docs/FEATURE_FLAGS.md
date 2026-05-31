# UDB Feature Flags

**Last updated:** 2026-05-31 | **Version:** v15.0-hardened

## Summary

| State | Count | Flags |
|-------|-------|-------|
| ON | 4 | safety-score, data-export, messaging, skill-gap-analysis |
| OFF | 9 | offline-tutor, biometric-feed, electron-agent, joon-world, co-op-quests, institutional, quest-store, ai-feedback, streak-freeze-auto |
| **Total** | **13** | |

## Flags Inventory

| Flag | State | Backend Service | Tests | Frontend Route | Notes |
|------|-------|-----------------|-------|----------------|-------|
| safety-score | ON | `safety.service.ts` | ✅ | `/dashboard/safety` | Composite safety score (0-100) |
| data-export | ON | `gdpr.service.ts` | ✅ | `/dashboard/settings` | JSON-LD data export with 7-day download link |
| messaging | ON | `messaging.service.ts` | ✅ | `/dashboard/messages` | Text chat all ages, voice 13+ |
| skill-gap-analysis | ON | `ai.service.ts` (embedded) | ✅ (in ai.service.spec.ts) | via GraphQL queries | Subject gap scores < 0.3 flagged as critical |
| offline-tutor | OFF | `offline-tutor.service.ts` | ✅ | — | Requires Electron/React Native with Mistral-7B GGUF |
| biometric-feed | OFF | `biometric.service.ts` | ✅ | `/dashboard/biometric` | Requires HealthKit / Google Fit native SDKs |
| electron-agent | OFF | — | — | — | Requires Electron desktop app (was `desktop-agent` in docs) |
| joon-world | OFF | `joon-world.service.ts` | ✅ | `/dashboard/joon-world` | Feature complete, needs family UAT |
| co-op-quests | OFF | `quests.service.ts` (embedded) | ✅ | — | Needs real family testing |
| institutional | OFF | — | — | — | Requires Clever/ClassLink OAuth + DPA |
| quest-store | OFF | — | — | — | Requires content creator onboarding workflow |
| ai-feedback | OFF | `ai.service.ts` (embedded) | ✅ | — | Contextual feedback after tutoring sessions |
| streak-freeze-auto | OFF | `gamification.service.ts` (embedded) | ✅ | — | Auto-apply streak freeze when biometrics indicate illness |

## OFF Flags — What's Needed to Enable

| Flag | Blockers | Dependencies | Estimated Effort |
|------|----------|-------------|-----------------|
| offline-tutor | Client-side ML runtime | Electron or React Native + Mistral-7B GGUF | Weeks (client dev) |
| biometric-feed | Native SDK bridges | React Native HealthKit / Google Fit | Weeks (mobile dev) |
| electron-agent | Desktop app build | Electron packaging + code signing | Weeks (desktop dev) |
| joon-world | Family UAT | Recruit test families | Days (QA) |
| co-op-quests | Family UAT | Recruit test families | Days (QA) |
| institutional | DPA + OAuth partnership | Clever/ClassLink integration + legal | Weeks (legal + dev) |
| quest-store | Vendor onboarding | Content creator review workflow | Weeks (dev + ops) |
| ai-feedback | Toggle decision | Product owner approval | Minutes |
| streak-freeze-auto | Edge case validation | Limited rollout to beta users | Days (QA) |

## Management

Feature flags are managed through:
1. **Admin dashboard** — `/dashboard/admin/features`
2. **API** — `FeatureFlagService` in `feature-flag.service.ts`
3. **Environment** — Can be overridden via env vars (NestJS ConfigService)

Flags are loaded at startup from hard-coded defaults in `FeatureFlagService.initializeDefaultFlags()`. Toggling via the admin dashboard updates in-memory state only (not persisted across restarts without a backing store).
