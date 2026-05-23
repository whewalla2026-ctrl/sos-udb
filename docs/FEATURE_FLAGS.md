# Feature Flags — v10.0 Staging Deployment

**Generated:** 2026-05-23
**Branch:** `release/v1-production` | **Tag:** `v9.0-hardened`

---

## Architecture

Feature flags are managed by `FeatureFlagService` (`services/api/src/feature-flags/feature-flag.service.ts`), which uses an in-memory `Map<string, FeatureFlag>` initialized from defaults. No external flag provider (Unleash/LaunchDarkly) is deployed — flags are toggled at startup via environment variables or at runtime via the admin API.

To override a flag at startup, set `FEATURE_FLAG_<NAME>=true|false` in the environment. Example:
```
FEATURE_FLAG_SAFETY_SCORE=true
FEATURE_FLAG_OFFLINE_TUTOR=false
```

---

## Flag Inventory — All 25 Flags

### Core Flags (ON — validated, production-ready)

| # | Flag | State | Owner | Activation Criteria | Notes |
|---|------|-------|-------|-------------------|-------|
| 1 | `messaging` | **ON** | Safety | Always on since v8.0 | Content moderation, COPPA VPC, report system — 8 unit tests |
| 2 | `safety-score` | **ON** | Safety | Always on since v8.0 | Safety score calculation, trend detection — 9 unit tests |
| 3 | `data-export` | **ON** | GDPR | Always on since v8.0 | GDPR data export — 12 unit tests |
| 4 | `skill-gap-analysis` | **ON** | Academic | Always on since v9.0 | Subject-level skill gap analysis |
| 5 | `audit-trail` | **ON** | Platform | Always on since v7.0 | WORM audit log — 9 unit tests |
| 6 | `rate-limiting` | **ON** | Platform | Always on since v9.0 | 600 req/min ThrottlerGuard — security PASS |
| 7 | `introspection-block` | **ON** | Security | Always on since v9.0 | GraphQL introspection disabled — security PASS |
| 8 | `coppa-vpc` | **ON** | Safety | Always on since v8.0 | COPPA Voice Pattern Consent validation |
| 9 | `jwt-auth` | **ON** | Auth | Always on since v7.0 | JWT enforcement with GqlAuthGuard — security PASS |
| 10 | `rbac` | **ON** | Auth | Always on since v8.0 | RolesGuard for admin mutations — security PASS |
| 11 | `input-validation` | **ON** | Platform | Always on since v7.0 | ValidationPipe whitelist+forbidNonWhitelisted |
| 12 | `points-ledger` | **ON** | Gamification | Always on since v8.0 | Immutable points ledger |

### Deferred Flags (OFF — not validated for production)

| # | Flag | State | Owner | Target Activation | Risk |
|---|------|-------|-------|-------------------|------|
| 13 | `offline-tutor` | **OFF** | AI/Tutor | v11.0 | STUB — server-side sync only; client offline model not built |
| 14 | `biometric-feed` | **OFF** | Biometric | v11.0 | STUB — HealthKit/Google Fit SDK not built |
| 15 | `electron-agent` | **OFF** | Agent | v11.0 | STUB — Electron desktop agent not built |
| 16 | `joon-world` | **OFF** | Social | v11.0 | WebXR social world not validated |
| 17 | `co-op-quests` | **OFF** | Gamification | v11.0 | Multi-child quests not validated |
| 18 | `institutional` | **OFF** | Platform | v12.0 | School/DPA institutional features |
| 19 | `quest-store` | **OFF** | Marketplace | v11.0 | Avatar item store |
| 20 | `ai-feedback` | **OFF** | AI | v12.0 | AI-generated parenting feedback |
| 21 | `streak-freeze-auto` | **OFF** | Gamification | v11.0 | BR-06 autoreload requires mobile SDK |
| 22 | `desktop-agent` | **OFF** | Agent | v11.0 | Offline focus tracking (alias for electron-agent) |
| 23 | `mobile-biometric-sync` | **OFF** | Biometric | v11.0 | Wearable sync (HealthKit/Google Fit) |
| 24 | `socratic-tutor-4.0` | **OFF** | AI/Tutor | v12.0 | Next-gen Socratic tutor |
| 25 | `venture-escrow` | **OFF** | Entrepreneurship | v11.0 | Full Stripe escrow for kid ventures |

---

## Summary

- **12 flags ON** — core platform, auth, security, safety, GDPR, gamification
- **13 flags OFF** — deferred to v11.0/v12.0, all have `OFF` default in code
- Safety net: if any OFF flag causes issues, it remains OFF — no production impact
