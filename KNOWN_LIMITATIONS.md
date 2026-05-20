# UDB Known Limitations — v4.1-pre

**Generated:** 2026-05-20
**Branch:** `release/v1-production` | **Commit:** `fc3aa65`

---

## Deferred to v4.1

### Electron Desktop Agent (GAP-04)
- **Status:** Server-side heartbeat endpoint implemented (`agent.service.ts`, `agent.controller.ts`). Client Electron app not built.
- **Impact:** Safety Score uses in-platform activity only. No desktop focus tracking.
- **Fallback:** Feature flag `desktop-agent` = OFF. Safety Score calculation excludes external focus data.
- **Workaround:** Parents can manually review child's app usage.

### Mobile Biometric SDK (HealthKit / Google Fit)
- **Status:** Server pipeline complete (API → TimescaleDB → aggregates → chronotype → Doter). Mobile React Native module for HealthKit/Google Fit not implemented.
- **Impact:** Biometric data must be ingested via API call. No automatic wearable sync.
- **Fallback:** Feature flag `mobile-biometric-sync` = OFF. Manual entry or future SDK required.
- **Note:** GAP-02 (streak freeze auto-grant) has no real-world trigger until mobile SDK exists.

### Offline Socratic Tutor — Client-Side Model
- **Status:** NOT IMPLEMENTED.
- **What exists:** Server-side `offline-tutor.service.ts` handles session sync when reconnecting. Scaffolding responses generated on server, not on device.
- **What is missing:**
  - Mistral-7B-Q4 GGUF model running on client device
  - Local SQLite-vec vector database
  - Client-side offline detection (`navigator.onLine`)
  - True offline operation without internet
- **Impact:** Child cannot use tutor offline. Requires internet connection.
- **Affected BRs:** BR-13 (offline mode parent toggle), BR-14 (assignment detection offline) cannot be tested without true offline capability.

---

## Pre-existing Issues

### TypeScript Compilation Errors
- **Status:** ~45 type errors preventing build
- **Key issues:**
  - Missing module imports (UupSyncModule → UUPSyncModule)
  - Uninstalled dependencies (@nestjs/event-emitter, @nestjs/bullmq, @pinecone-database/pinecone, argon2, bcrypt, jwks-rsa)
  - Prisma schema field mismatches
- **Impact:** API will not compile. Build fails.

### Test Suite
- **Status:** Tests exist but cannot run (OOM)
- **E2E tests:** Memory exhausted during run
- **Unit tests:** No test files exist (only E2E tests present)
- **Coverage:** Unknown (cannot measure without running tests)

### Missing Dependencies (package.json)
The following packages are imported but not in dependencies:
- `@nestjs/event-emitter`
- `@nestjs/bullmq`
- `@pinecone-database/pinecone`
- `argon2`
- `bcrypt`
- `jwks-rsa`
- `stripe` (actually present in package.json, may need configuration)

---

## Infrastructure Gaps (Next Release Cycle)

1. **SIEM integration** - Not configured
2. **Backup encryption verification** - Pending
3. **Centralized logging** - Beyond Loki not implemented

---

## Honest Score Assessment

| Area | Score | Notes |
|------|-------|-------|
| Core platform logic | 8.0/10 | Services implement business logic correctly |
| TypeScript build | 2.0/10 | ~45 errors, missing dependencies |
| Tests | 2.0/10 | Cannot run (OOM), no unit tests |
| Offline capability | 3.0/10 | Server-side sync only, no client offline |
| Mobile SDK | 1.0/10 | Not implemented |
| Security | 7.0/10 | Lint passes, but unverified runtime |
| **Overall** | **4.5/10** | Code structure exists, build/test fails |

---

## Recommendations for Production Readiness

1. **Fix type errors** - Install missing dependencies, fix import names
2. **Add unit tests** - Current test suite only has E2E, need unit coverage
3. **Increase test memory** - Configure jest for larger heap or split tests
4. **Implement true offline** - Requires Electron/React Native app, not just server code
5. **Add mobile SDK** - Requires React Native module for HealthKit/Google Fit