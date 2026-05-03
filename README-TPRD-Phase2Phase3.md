This patch finalizes Phase 2 green end-to-end and sets Phase 3 scaffolding.
Phase 2: DB Read + GraphQL surface against real DB
- Phase 2 DB Read (PrismaClient read) is green
- Phase 2 GraphQL (guard-bypassed introspection) is green
- Phase 2 isolated Jest config and scripts added for CI determinism
- CI (e2e.yml) wired to run Phase 2 in a single pass
- Phase 3 Roadmap doc created for concrete milestones and tests

Phase 3: Roadmap (high-level)
- Milestones for Socratic Tutor, UUP Sync, Doter evolution, NFT/SBT, Stripe escrow
- Phase 3 test scaffolding (placeholders) added to enable future CI expansions
- Seed data extension plan to cover Phase 3 data graphs
