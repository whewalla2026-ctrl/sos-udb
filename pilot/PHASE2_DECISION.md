Phase 2 Lean Pilot Decision

Decision: DELAY (Phase 2 lean pilot) — fix blockers first.

Rationale (crisp):
- P0 blockers identified that threaten pilot success: migration validation (UUP v1 → v2), AI cost/latency guard rails, monitoring gaps, LMS integration realism (Canvas), and vector store risk (guarded fallback).
- Without addressing these, Phase 2 risks data loss, runtime costs explosion, and a poor UX under load, undermining governance and credibility.
- A disciplined hardening window (2–3 weeks) to address P0 blockers yields a compliant, auditable, demo-ready Phase 1+Phase 2 baseline, enabling a credible go/no-go at the Phase 2 gate.

Scope alignment (as of now):
- Lean Phase 2 features only: Academic/Learning pillar, Weekly Planner, AI-lite hints, Canvas LMS adapter, local vector store with guarded Pinecone fallback. No Phase 3–5 or real-time cross-pillar orchestration.

What will be delivered in the 14–21 day hardening window:
- Phase 1 data migrations completed and validated to Phase 2 schema
- AI-lite guard rails fixed (timeout, hints-only, fallback) with budgets and kill-switch
- Monitoring stack completed (logs, metrics, alerts) and a pilot dashboard
- Canvas LMS integration hardened (production-grade adapter or realistic adapter) with safe fallback
- Vector store guard rails implemented (local first, Pinecone fallback guarded by flag)
- Phase 2 gating artifacts prepared (PHASE2_FINAL.md update) and live-demo plan aligned to the gating criteria

Exit criteria for Phase 2 decision point:
- Migration validated on staging with rollback tested and mapped to a reversible plan
- AI latency stability under load (<= 500ms hints) with defined fallback behavior
- Monitoring in place with alerts and dashboards
- LMS adapter proven stable or safely bypassable with onboarding unaffected
- Phase 2 gating artifacts ready for Phase 2 Go/No-Go PR

Owner: CTO/PM & SRE Lead – accountable for gate, evidence, and rollout readiness.
