Phase 2 Lean Pilot — Fix Plan (P0 blockers)

P0 Blockers (must fix before Phase 2 go-live):
- Migration validation: finalize safe, reversible UUP v1→v2 migration and rollback scripts; staging data validated; rollback proven.
- AI cost/latency guardrails: enforce 500ms hints timeout, implement robust fallback, budgets per user/tenant, kill switch.
- Monitoring gaps: implement logs, metrics, /metrics endpoint, and alerting rules; establish a pilot dashboard.
- LMS real adapter readiness: Canvas adapter with OAuth or production-like test adapter; mapping to UUP v2; onboarding unaffected if LMS is down.
- Vector store risk: ensure local fallback is tested under load; pinecone is guarded by feature flag; implement a safe toggle.
- Data integrity validation: migration test plan (test counts, random sampling, and reconciliation checks).

Planned remediation cadence (days):
- Day 1–4: Data migration scaffolding and rollback drills; ensure reversible migrations are in place and tested.
- Day 5–7: AI guardrails finalization; latency tests; implement budget guards and kill switches.
- Day 8–10: Monitoring stack completion; metrics, logs, alerts, basic dashboards.
- Day 11–13: LMS adapter hardening; OAuth flows; safe fallback path.
- Day 14: End-to-end gating test; attach evidence to PR; prepare Phase 2 final gate artifact.

Exit criteria to mark fixed:
- Migration script executes on staging with 0 data loss and rollback tested in a simulated revert.
- AI latency is bounded; hints are returned within 500ms; fallback triggers reliably within 200ms.
- Monitoring is fully functional with 3–4 alerts defined and tested.
- Canvas LMS adapter wired; if LMS is unreachable, onboarding/planner continue logically.
- Vector store fallback passes under stress; Pinecone guarded by feature flag and budgets.
- Phase 2 gating artifact ready (PHASE2_FINAL.md updated).

Owner: Phase 2 Lead, SRE, and Data Architect.
