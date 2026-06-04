Both rebuilt. Now recre



Status Update — All 6 Auth Pipeline Fixes Deployed \& Verified

What was broken

The frontend at localhost:3030 couldn't log in or load the dashboard because 6 independent issues blocked the auth pipeline end-to-end.



Root causes (all fixed)

\#	Issue	Fix

1	docker-compose.prod.yml auth-service had no JWT\_SECRET → it used a fallback secret, while the API used ${JWT\_SECRET}. Tokens from auth-service were rejected by the API's JwtStrategy as UNAUTHENTICATED	Added JWT\_SECRET: ${JWT\_SECRET} to auth-service env

2	middleware.ts defaulted to Docker hostnames (api:4000, gateway:3000) — unreachable when the frontend runs on the Windows host. NextResponse.rewrite() failed silently → "Network error" in Apollo Client	Dev mode uses localhost:4000/localhost:3000; Docker (production) still uses Docker hostnames

3	auth.controller.ts login/register/refresh returned { userId, email, ... } without token/refreshToken in the body → setTokens(undefined, undefined) left localStorage empty	Added token and refreshToken to all three endpoint responses

4	Auth-service stored refresh tokens as refresh:${userId}:${hash} → 'valid', but API looked for refresh:${hash} → JSON.parse("{userId}"). Key format mismatch — refresh cross-compatibility was impossible	Changed auth-service to refresh:${hash} → JSON.stringify({ userId })

5	Gateway had no /auth/logout route → frontend POST got 404, server-side blacklisting skipped	Added app.post('/auth/logout', requireAuth, ...) to gateway with JTI blacklist + Redis cleanup

6	NEXT\_PUBLIC\_API\_URL=http://localhost:4000/graphql in .env.development bypassed the middleware entirely → REST auth calls hit the API directly, not through the gateway	Changed to /graphql (relative) so all requests go through the middleware, which routes to the correct internal service

Current test results (all passing)

Login:    POST /auth/login  → gateway  → 200 + token + refreshToken

GraphQL:  POST /graphql     → middleware → API → 200 + user data

Refresh:  POST /auth/refresh → API      → 201 + new tokens (cookie-based)

Logout:   POST /auth/logout → gateway  → 200 + {"success":true}

How to test

Visit http://localhost:3030/auth/login and log in with the test user we registered:



Email: test2@example.com

Password: Test123!

The dashboard should load. Hard-refresh the page to test token refresh on reload. Logout should work cleanly.



Remaining risk

The Apollo Client error link has no retry counter — if a token refresh succeeds but the retried query fails for another reason, it could loop infinitely. This is a low-severity issue to address separately.





