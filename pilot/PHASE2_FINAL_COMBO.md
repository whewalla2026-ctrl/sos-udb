Phase 2 Lean Pilot: Final Combined Go/No-Go (Lean, Production-Ready)

Scope (STRICT):
- UUP v2 relational core (Postgres), limited JSONB metadata
- Weekly Planner (core flows only)
- AI-lite hints (<= 500ms) with strict fallback
- Canvas LMS integration (OAuth-enabled) as the single data path
- Local vector store as primary; Pinecone fallback guarded by guardrails
- Guardrails: cost, latency, monitoring; no new features beyond Phase 2 scope

What is included in this Go/No-Go artifact:
- Migration plan: UUP v1 → v2 with reversible steps and rollback strategy
- Phase 2 lean architecture changes (AI-lite, planner, LMS integration adapter, vector/local store)
- Phase 2 performance targets (p95/API latency, AI latency, cost guardrails)
- Phase 2 monitoring plan (logs/metrics/alerts) and a minimal pilot dashboard
- Phase 2 demo script and evidence plan
- Phase 2 tests: phase2_lean.spec.ts (unit/integration), phase2_e2e.spec.ts (end-to-end skeleton)

Exit criteria:
- All blockers resolved on 2-week horizon; go/no-go decision documented
- Phase 2 runs under CI and a reproducible demo is available
- Phase 2 gating evidence attached to PR
