# TOKEN SECURITY REPORT — SOS-UDB

**Date:** 2026-05-10  
**Phase:** Phase 2

---

## ACCESS TOKEN
| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Secret source | JWT_SECRET env var |
| Fallback | None (fails hard if unset) |
| Expiry | 15m (was 7d) |
| Payload | `{ sub: userId, email, role, jti }` |
| JTI | Random UUID per token |
| Blacklist | Redis key `blacklist:<jti>` with TTL matching token expiry |

## REFRESH TOKEN
| Property | Value |
|----------|-------|
| Format | `uuid-uuid` (two UUIDs joined by `-`) |
| Storage | SHA-256 hash in Redis |
| Redis key | `refresh:<sha256>` |
| Redis value | `{ userId }` |
| TTL | 7 days |
| Rotation | Old token deleted on refresh (one-time use) |

## LOGOUT FLOW
```
1. Decode access token to extract jti
2. Store jti in Redis blacklist with remaining token TTL
3. Delete refresh token from Redis
4. Return success
```

## TOKEN BLACKLIST FLOW (JwtStrategy)
```
1. Extract jti from JWT payload
2. Check Redis for `blacklist:<jti>`
3. If exists → throw UnauthorizedException('Token has been revoked')
4. If not → proceed with user validation
```

## ATTACK MITIGATION
| Attack | Mitigation | Status |
|--------|-----------|--------|
| Token replay | JTI + blacklist; refresh one-time rotation | ✅ |
| Token forgery | Strong JWT_SECRET required; no fallback | ✅ |
| Stolen refresh token | Rotation means used token becomes invalid | ✅ |
| XSS token theft | Refresh tokens NOT returned in GraphQL responses (only via mutation) | ⚠️ Partial |
| CSRF | No auth cookies (tokens in request body) | ✅ N/A |
