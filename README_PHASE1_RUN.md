Phase 1 Runbook (Foundation)

- Start steps:
- Run monorepo bootstrap: install dependencies with pnpm i
- Start API: cd services/api; pnpm i; pnpm run start
- Start Web: cd apps/web; pnpm i; pnpm run dev
- Basic local tests:
- Call REST: POST /auth/register to create a parent/child and get consent token.
- Call REST: POST /auth/verify with token to get a basic auth token (simulated).
- Use GraphQL endpoint to upsert UUP and verify evolution triggers.
