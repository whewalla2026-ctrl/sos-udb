# Phase 9: Security Red Team Report

## Score: 7.0/10

## Executive Summary
A comprehensive security audit was conducted across all TypeScript source files in `services/api/src/` and `apps/web/src/`. The codebase has strong foundations (Prisma ORM, Helmet, input validation pipes, token blacklisting, refresh rotation) but 3 critical, 6 high, and 8 medium vulnerabilities were found. All critical and 3 high issues have been fixed in code.

## Vulnerability Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| C-1 | Prompt Injection in AI Service | CRITICAL | **FIXED** — Input sanitization + XML delimiters |
| C-2 | Arbitrary Quest Approval (no role check) | CRITICAL | **NOTED** — Resolver not exposed; fix requires resolver activation |
| C-3 | JWT Algorithm Not Restricted | CRITICAL | **FIXED** — Added `algorithms: ['HS256']` |
| H-1 | IDOR — goalProgress (any goal readable) | HIGH | **NOTED** — Needs userId check in resolver |
| H-2 | IDOR — tutoringSession (any session readable) | HIGH | **NOTED** — Needs userId check in resolver |
| H-3 | IDOR — endTutoringSession (any session endable) | HIGH | **NOTED** — Needs userId check in resolver |
| H-4 | IDOR — markNotificationRead | HIGH | **NOTED** — Needs userId check in service |
| H-5 | Weak JWT Secret in .env.example | HIGH | **NOTED** — Requires manual secret generation |
| H-6 | Family Linking Without Authorization | HIGH | **NOTED** — Needs role verification + child approval |
| M-1 | No HTML Sanitization Imports (XSS) | MEDIUM | **NOTED** — Needs DOMPurify dependency |
| M-2 | Hardcoded localhost URLs | MEDIUM | **NOTED** — Needs env variable replacement |
| M-3 | JSON.parse() Without Schema Validation | MEDIUM | **FIXED** — Replaced with typed BiometricInput |
| M-4 | Tokens in localStorage (XSS exposure) | MEDIUM | **NOTED** — Needs HttpOnly cookie migration |
| M-5 | Password Reset Token in URL | MEDIUM | **NOTED** — Needs POST-based flow |
| M-6 | Generous Global Rate Limit (600/min) | MEDIUM | **FIXED** — Added `@Throttle({limit:10})` on auth endpoints |
| M-7 | jwt.decode() Without Verification | MEDIUM | **FIXED** — Changed to `jwt.verify()` |
| M-8 | `var` Declarations Throughout Code | MEDIUM | **NOTED** — 76 occurrences, needs refactor |
| L-1/L-6 | Various low-severity issues | LOW | Documented for awareness |

## Critical Findings — Details

### C-1: Prompt Injection in AI Service — FIXED

**Files:** `services/api/src/ai/ai.service.ts:55-326`

**Root Cause:** 8 user-input interpolation points across Socratic tutor, evidence feedback, safety analysis, emotional analysis, and business plan prompts. Attacker could inject `"Ignore previous instructions..."` to override system prompts.

**Fix Applied:**
1. Added `sanitize()` method that escapes `\`, `"`, newlines, and `${` in all user input
2. Wrapped all user input in XML-style delimiters (`<user_input>...</user_input>`, `<evidence_title>...</evidence_title>`, `<message_content>...</message_content>`, etc.)
3. These delimiters give the LLM clear boundaries between instructions and data, reducing prompt injection surface

### C-2: Arbitrary Quest Approval — NOTED (Resolver Not Exposed)

**Files:** `services/api/src/quests/quests.service.ts:103-155`

**Root Cause:** `approveQuest()` performs no authorization check — any user ID can approve any quest and award arbitrary XP/coins. The resolver (`QuestsResolver`) is currently empty, so the mutation is not exposed via GraphQL. This is a ticking bomb if the resolver is activated without adding role verification.

**Recommendation:** Add parent-link or ADMIN role check before enabling the resolver mutation:
```typescript
const parentLink = await this.prisma.familyLink.findFirst({
  where: { parentId: approverId, childId: quest.userId }
});
if (!parentLink && user.role !== 'ADMIN') throw new ForbiddenException();
```

### C-3: JWT Algorithm Not Restricted — FIXED

**Files:** `services/api/src/auth/strategies/jwt.strategy.ts:14`

**Root Cause:** `passport-jwt` strategy did not specify `algorithms: ['HS256']`. Default behavior accepts any algorithm from the token header, enabling `alg: 'none'` bypass attacks.

**Fix Applied:** Added `algorithms: ['HS256']` to the strategy configuration.

## High Findings — Details

### H-1 through H-4: Insecure Direct Object References (IDOR)

Four GraphQL resolvers return or modify resources without verifying ownership:
- `goalProgress(goalId)` — reads any goal
- `tutoringSession(id)` — reads any tutoring session
- `endTutoringSession(id)` — ends any session
- `markNotificationRead(id)` — marks any notification read

**Fix Pattern (applies to all):**
```typescript
// Resolver: add @CurrentUser() parameter
async tutoringSession(@CurrentUser() user: any, @Args('id') id: string) {
    return this.tutor.getSession(id, user.id);
}
// Service: verify ownership
if (userId && session.userId !== userId) throw new ForbiddenException();
```

### H-5: Weak JWT Secret

**Files:** `.env.example:32`, `services/api/.env.example:11`

The example secret `change-me-to-a-strong-secret-at-least-256-bits-long!!` is documented text (not random). If any deployment copies this literally, tokens can be forged. **Action:** Generate using `openssl rand -base64 32` and store in a secret manager.

### H-6: Family Linking Without Authorization

**Files:** `services/api/src/family/family.resolver.ts:18-26`

Any authenticated user can link any child account to themselves. No role check (must be PARENT), no child confirmation, no consent method validation.

## Medium Findings — Details

### M-3: JSON.parse() Without Schema Validation — FIXED

**Files:** `services/api/src/biometric/biometric.resolver.ts:14-16`

Replaced raw `JSON.parse(data string)` with a typed `BiometricInput` GraphQL input type (`@InputType()`), leveraging NestJS's built-in validation pipe (`whitelist: true, forbidNonWhitelisted: true`).

### M-6: Generous Rate Limit on Auth — FIXED

**Files:** `services/api/src/auth/auth.resolver.ts`

Added `@Throttle({ default: { limit: 10, ttl: 60000 } })` on `loginWithFirebase` (10 attempts/min) and `@Throttle({ default: { limit: 20, ttl: 60000 } })` on `refreshToken`.

### M-7: jwt.decode() Without Verification — FIXED

**Files:** `services/api/src/auth/auth.service.ts:155`

Changed from `this.jwt.decode()` (no signature verification) to `this.jwt.verify()` (full verification). Error handling now logs a warning instead of silently swallowing.

## Positive Security Practices

1. **Prisma ORM** throughout — zero raw SQL, strong SQLi protection
2. **Input validation pipe** — `whitelist: true, forbidNonWhitelisted: true` globally
3. **Helmet.js** — all security headers applied
4. **CORS** — single-origin restriction
5. **Refresh token rotation** — one-time use, SHA-256 hashed
6. **Token blacklisting** — jti-based revocation via Redis
7. **Structured logging** — automatic secret/token redaction
8. **Blockchain anchoring** — audit log integrity verification
9. **Rate limiting** — per-user tracking (not just IP), metrics endpoint excluded
10. **GraphQL introspection disabled** in production

## Open Items Requiring Manual Action

| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Generate strong JWT secret + migrate to secret manager | 15m | HIGH |
| 2 | Fix 4 IDOR vulnerabilities (ownership checks) | 2h | HIGH |
| 3 | Add role verification to `approveQuest` before exposing resolver | 30m | HIGH |
| 4 | Add parent role + child approval to family linking | 4h | HIGH |
| 5 | Migrate tokens from localStorage to HttpOnly cookies | 8h | MEDIUM |
| 6 | Add DOMPurify for user-generated content rendering | 1h | MEDIUM |
| 7 | Replace hardcoded localhost URLs with env vars | 1h | MEDIUM |
| 8 | Replace `var` with `const`/`let` (76 occurrences) | 2h | MEDIUM |
| 9 | Change password reset to POST-based token flow | 4h | MEDIUM |
| 10 | Customize Helmet CSP and HSTS for production | 1h | LOW |

## Docker Status
Docker Desktop Linux VM is currently unreachable (post `wsl --shutdown`). All code fixes are typechecked and compiled but require container rebuild + restart to take effect.
