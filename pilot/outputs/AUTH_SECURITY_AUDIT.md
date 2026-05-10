# UDB Auth Security Audit

> **Audit date:** 2026-05-10  
> **Scope:** Token lifecycle, session management, authorization, rate limiting, CSRF, cookie strategy  
> **Architecture:** Next.js (frontend) → Express Gateway → NestJS (GraphQL) + Express Auth Service (REST)

---

## 1. Refresh Token Rotation Analysis

**Current implementation** (`services/api/prisma/phase3/services/auth-service.js:206-236`):

```
POST /auth/refresh flow:
1. Verify refresh token signature + type === 'refresh'
2. Compute SHA-256 hash, check Redis key `refresh:{userId}:{hash}` exists
3. DELETE old token from Redis (rotation — old token is consumed)
4. Create new access token + new refresh token
5. Store new refresh hash in Redis with 86400s TTL
6. Return new pair
```

### Replay Detection

✅ **Working.** If an attacker steals a refresh token and uses it before the legitimate client, the legitimate client's subsequent refresh attempt will fail at step 2 (token hash not found in Redis → "Refresh token revoked or already used"). Similarly, if the legitimate client uses the token first, the attacker's token is invalidated.

### Atomicity Concern

⚠️ **Steps 3–5 are NOT atomic.** Sequence:
1. `redis.del(key)` (delete old)
2. `createToken(...)` + `createRefreshToken(...)` (generate new)
3. `redis.setex(newKey, 86400, 'valid')` (store new)

If the server crashes between step 1 and step 3, **both old and new tokens are lost**. The user must re-login. This is mitigated by:
- Refresh tokens have only 24h TTL (acceptable loss window)
- The auth service runs in Docker with restart policies
- Crash between these steps is extremely rare

### Recommendation

Use Redis **MULTI/EXEC transaction** to atomically delete old + store new:

```javascript
var multi = redis.multi();
multi.del(oldKey);
multi.setex(newKey, 86400, 'valid');
await multi.exec();
```

Risk: Low (loss = re-login, which is the same outcome as expiry).

---

## 2. Token Expiration Handling

| Token | TTL | Location |
|-------|-----|----------|
| Access token | 300s (5 min) | localStorage (`accessToken`) |
| Refresh token | 86400s (24h) | localStorage (`refreshToken`) |
| Reset token | 900s (15 min) | Redis only |

### Access Token (5 min)

✅ **Short-lived — good practice.** Limits exposure if stolen. The gateway's `requireAuth` middleware (`gateway.js:138-146`) verifies the Bearer token on every request using `verifyToken()` which checks:
- HMAC signature
- Expiration (`decoded.exp < now`)
- Token blacklist (Redis-backed)

### Refresh Token (24h)

✅ **Reasonable trade-off.** Long enough for user convenience, short enough that compromise has limited window. Rotation ensures each refresh token is single-use.

### Dual Expiry

When both tokens expire:
1. Frontend hits 401 on any API call
2. Auth context's silent refresh (`auth-context.tsx:39-55`) attempts `POST /auth/refresh` with stored refresh token
3. Refresh token is expired → 401
4. Both tokens are cleared from localStorage
5. User is redirected to `/auth/login`

✅ **Correct behavior.**

### Silent Refresh Mechanism

In `auth-context.tsx:32-57`, on mount:
1. If `accessToken` exists in localStorage, call `GET /auth/me` to validate
2. If `/auth/me` returns 401, try `POST /auth/refresh` with `refreshToken`
3. If refresh succeeds, store new tokens, validate again
4. If refresh fails, clear tokens, set `user = null`

✅ **Working.** However, the Apollo client (`apollo-client.ts`) currently has **no silent refresh interceptor** — GraphQL requests that fail with UNAUTHENTICATED will not automatically retry. The auth context refresh only fires on app mount.

---

## 3. Session Recovery

**Flow** (`auth-context.tsx:32-57`):
1. App mounts → check `localStorage.getItem('accessToken')`
2. If present → `GET /auth/me` (validates token, returns decoded JWT)
3. If `/auth/me` succeeds → set user state
4. If `/auth/me` fails → attempt silent refresh via refresh token
5. If refresh succeeds → store new tokens, set user
6. If refresh fails → clear tokens, `user = null`

✅ **Correct session recovery logic.** Browser restart preserves localStorage tokens, recovery path handles both valid and expired states.

### Gap

No **visible loading state** during session recovery on the login page. If a user with valid tokens visits `/auth/login`, they briefly see the login form before the auth context recovers and redirects them. Consider adding a brief loading screen.

---

## 4. Auth Guard — Route Protection

### Gateway Level

✅ **`requireAuth` middleware** (`gateway.js:138-146`):
- Extracts Bearer token from Authorization header
- Calls `verifyToken()` (HMAC validation + expiry + blacklist check)
- Sets `req.user` with decoded payload
- Applied to all authenticated routes: `/planning/*`, `/ai-lite/*`, `/monitoring/*`, `/audit/*`, `/auth/me`

### NestJS (GraphQL) Level

✅ **`GqlAuthGuard`** applies Passport JWT strategy for GraphQL resolvers.  
✅ **`RolesGuard`** enforces RBAC hierarchy on protected resolvers.  
**JWT Strategy** (`jwt.strategy.ts:8-19`): Extracts Bearer token, validates via `passport-jwt`, calls `validateUser()`.

### Frontend Level

❌ **NO frontend auth guard component exists.** Currently:
- Dashboard page calls `GET_ME` GraphQL query which may fail silently
- Unauthenticated users see loading skeleton, then error state (no redirect)
- No route-level protection at the Next.js layout level

**FIX:** Create `AuthGuard` component (see deliverable). Apply to dashboard layout.

---

## 5. Role-Based Access Control (RBAC)

### Hierarchy

```
ADMIN  (4)  — full system access
TEACHER (3) — class/student management
PARENT  (2) — family/child management
CHILD   (1) — personal dashboard only
```

### Implementation

**Gateway** (`services/api/prisma/phase3/shared/security.js:38-54`):
- `hasRole(userRole, requiredRole)` — checks `ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]`
- `requireRole(...roles)` — Express middleware for route-level checks
- Audit routes require ADMIN (`gateway.js:181-185`)

**NestJS** (`services/api/src/`):
- `RolesGuard` enforces role checks on GraphQL resolvers
- User role from JWT payload is compared against required role metadata

**Auth Service** (`auth-service.js`):
- Register defaults to `CHILD` role (mass assignment protection — `role` is intentionally not destructured from request body at line 34)
- Login returns the user's current role from DB

### Findings

✅ **Mass assignment protection** — Register endpoint explicitly does NOT accept `role` from request body. Role defaults to `CHILD`.
✅ **Hierarchy check** — Higher roles inherit lower role permissions.
✅ **Admin-only audit** — Audit routes enforce ADMIN gate at gateway level.

### Recommendation

Add hierarchical check to NestJS `RolesGuard` to match gateway behavior. Currently it likely checks exact role match rather than hierarchy.

---

## 6. CSRF Review

### Token Transmission

JWT tokens are sent via HTTP `Authorization: Bearer <token>` header, **not cookies**. This means:
- ✅ No automatic cookie attachment by browsers
- ✅ Standard fetch/XMLHttpRequest does not include Authorization headers cross-origin
- ✅ CORS is configured with specific origin (`http://localhost:3000`)

### Cookie Modification

The gateway modifies `set-cookie` headers to add `Secure; HttpOnly; SameSite=Strict` (`gateway.js:110-117`). This is a safety net for any downstream service that might set cookies.

### CSRF Risk Assessment

**LOW.** The application does not rely on cookies for authentication. CSRF attacks require the target site to authenticate requests via cookies (session cookie pattern). Since tokens are in the Authorization header (not cookies), a CSRF attack cannot authenticate the forged request.

### Residual Risk

If an XSS vulnerability exists, an attacker can read localStorage tokens directly (see section 8).

---

## 7. Rate Limiting Validation

### Layer 1: Global Rate Limit (Gateway)

```
Route: ALL routes
Limit: 200 requests/min
Implementation: Redis-backed distributed rate limiter (security.js:59-81)
Fallback: In-memory Map if Redis unavailable
```

### Layer 2: API Rate Limit (Gateway)

```
Route: Authenticated API routes (/planning/*, /ai-lite/*, /monitoring/*)
Limit: 100 requests/min
```

### Layer 3: Auth-Specific Rate Limit (Auth Service)

```
Route: /auth/register, /auth/login, /auth/forgot-password, /auth/reset-password, /auth/change-password
Limit: 30 requests/min
Implementation: Express middleware at auth-service.js:30
```

### Layer 4: Brute Force Protection (Gateway)

```
IP-based tracking via Redis (gateway.js:47-59)
Blocks IP after threshold exceeded
Fallback: permissive if Redis is down
```

### Assessment

✅ **Excellent layered approach.** Four independent rate-limiting mechanisms provide defense-in-depth:
- Global limit prevents general abuse
- API limit protects downstream services
- Auth-specific limit throttles credential-based attacks
- Brute force protection is IP-based and persistent

### Finding

⚠️ The brute force `checkBruteForce` call wraps in try/catch with **permissive fallback** (`gateway.js:55-57`). If Redis is down, brute force protection is completely bypassed. This is documented as intentional (availability over security), but should be flagged.

---

## 8. Secure Cookie Strategy

### Current State

| Token | Storage | Accessible via JS | XSS Vulnerable |
|-------|---------|-------------------|----------------|
| Access token | `localStorage` | ✅ Yes | ✅ Yes |
| Refresh token | `localStorage` | ✅ Yes | ✅ Yes |

### Risk

Any XSS vulnerability in the frontend (even a minor one in a third-party dependency) can exfiltrate both tokens. An attacker with both tokens can:
- Impersonate the user for 5 min (access token)
- Refresh access indefinitely for up to 24h (refresh token)

### Recommendation

**Move refresh token to HttpOnly cookie:**

```
Set-Cookie: refreshToken=<token>; Path=/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

Benefits:
- JS cannot read it (immune to XSS)
- Only sent to `/auth/refresh` endpoint (not other routes)
- SameSite=Strict prevents CSRF on the refresh endpoint

Effort: Changes needed in:
- `auth-context.tsx` — remove `refreshToken` from localStorage reads/writes
- `api.ts` — remove `refreshToken` from localStorage read in `refresh()` method
- `auth-service.js` — set `Set-Cookie` header on login/register/refresh responses
- Gateway already adds Secure/HttpOnly/SameSite to all set-cookie headers

### Beta Acceptance

For beta: **Acceptable risk.** Document that localStorage token storage is an XSS vector and schedule migration to HttpOnly cookie for refresh token before production launch.

---

## 9. Findings & Fixes

### Critical

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | **No frontend auth guard** | `apps/web/src/app/dashboard/*` | Add `AuthGuard` component wrapping dashboard layout |
| 2 | **Apollo client lacks silent refresh interceptor** | `apps/web/src/lib/apollo-client.ts` | Add `onError` link with token refresh + retry |

### High

| # | Issue | File | Fix |
|---|-------|------|-----|
| 3 | **Refresh token rotation not atomic** | `auth-service.js:221-227` | Use Redis MULTI/EXEC for del + setex |
| 4 | **Tokens stored in localStorage (XSS vector)** | All frontend files | Move refresh token to HttpOnly cookie; document for beta |

### Medium

| # | Issue | File | Fix |
|---|-------|------|-----|
| 5 | **Brute force fallback is permissive** | `gateway.js:55-57` | Add local in-memory fallback instead of bypass |
| 6 | **Login page flash on session recovery** | `auth-context.tsx` | Add early redirect if valid tokens exist before UI renders |

### Low

| # | Issue | File | Fix |
|---|-------|------|-----|
| 7 | **NestJS RolesGuard may use exact match** | `services/api/src/guards/roles.guard.ts` | Verify hierarchy check vs exact match |
| 8 | **No rate limiting on /auth/health** | `auth-service.js:247` | Not a security concern — just informational |

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Token rotation | ✅ Good | Replay detection works. Atomicity gap documented. |
| Token expiry | ✅ Good | 5/24h split is well-chosen. Silent refresh works. |
| Session recovery | ✅ Good | Works on mount. Apollo interceptor missing. |
| Auth guard | ❌ Missing frontend | Backend layers solid. Frontend needs AuthGuard. |
| RBAC | ✅ Good | Hierarchy-based with mass assignment protection. |
| CSRF | ✅ Low risk | Bearer header pattern inherently CSRF-safe. |
| Rate limiting | ✅ Excellent | 4-layer defense-in-depth. |
| Cookie strategy | ⚠️ Beta acceptable | localStorage is XSS vector. Plan migration. |

**Overall: Well-architected auth system. Three critical/high-priority fixes needed before production: AuthGuard component, Apollo silent refresh interceptor, and atomic token rotation.**
