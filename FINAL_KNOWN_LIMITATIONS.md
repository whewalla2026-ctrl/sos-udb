# Known Limitations — Phase 1-2 MVP Release

## Accepted (will not block release)

| # | Limitation | Severity | Impact | Mitigation |
|---|------------|----------|--------|------------|
| 1 | No persistent DB (in-memory state only) | MEDIUM | Data lost on restart. Not production-grade for multi-user. | Prisma/PostgreSQL schema exists and ready. Requires running Postgres. |
| 2 | AI hints are template-based (no ML) | LOW | Hints are deterministic and simplistic. Users may find them repetitive. | Intentional for Phase 1-2 cost control. Upgrade to ML in Phase 3. |
| 3 | LMS sync returns hardcoded demo data | MEDIUM | No real Canvas API integration. Demo data only. | Documented scaffold. Canvas API wiring expected when LMS module is activated. |
| 4 | pnpm lockfile is stale | LOW | CI/CD may fail if frozen lockfile is enforced. | Use `--no-frozen-lockfile` or regenerate lockfile before first CI run. |
| 5 | No remote configured | INFO | Cannot push to GitHub or create PR. | Manual: `git remote add origin <url> && git push --tags origin release/phase-2` |
| 6 | Tests replicate logic, don't load real TS services | LOW | Tests validate logic but not NestJS DI wiring or compilation. | Acceptable given TS compilation constraints. Logic is simple/deterministic. |
| 7 | `@nestjs/jwt`, `helmet`, `@nestjs/throttler` added to package.json but not yet installed | LOW | Dependencies listed but not yet present in node_modules. | Run `pnpm install` before deployment. |

## Not Applicable (by design)

- Blockchain/NFT/Wallet — Phase 4+ scope
- Biometric integration — requires hardware, not shipping
- RAG pipeline — disabled until >100 active users
- Socratic Tutor — Phase 3 scope
- Multi-LMS expansion — deferred
- Advanced AI orchestration — Phase 3+
- Stripe escrow — Phase 4+ scope
