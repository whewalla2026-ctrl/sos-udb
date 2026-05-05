Title: Release Phase 2 — Intelligence (LMS Deep Sync, Socratic Tutor, Rag, ADHD Micro-Quests, Weekly Planner)
Branch Target: main
Summary:
- Gate Phase 2 readiness for Phase 2 go-live with LMS Deep Sync surface, Socratic Tutor scaffolding, Rag wiring, ADHD micro-quests, and Weekly Planner integration.
- Includes Phase 2 MQATP mappings, demo scripts, and phase-2 runbooks.

What’s Included:
- LMS Sync endpoints: /lms-sync/ingest, /lms-sync/aggregate/:userId
- Aggregated LMS context endpoint for gating
- Socratic Tutor scaffolding (prompt templates, context wiring, path-to-solution logging)
- Rag pipeline scaffolding (RagModule, RagService, RagController) with a test endpoint
- ADHD micro-quests and Weekly Planner integration paths (generateWeeklyPlanWithMicroQuests)
- Phase 2 MQATP mapping (PHASE2_FINAL.md) and Phase 2 demo artifacts
- Phase 2 end-to-end tests scaffold (phase2_e2e.spec.ts)
- Lean AI: AiLite hints endpoint via /ai-lite/hint
- Lean vector store: in-memory vector store fallback
- Cost guard and Metrics scaffolding for Phase 2 cost control
- Phase 2 lean module wiring: AiLiteModule, VectorModule, CostModule, MetricsModule
- LMS Sync endpoints: /lms-sync/ingest, /lms-sync/aggregate/:userId
- Aggregated LMS context endpoint for gating
- Socratic Tutor scaffolding (prompt templates, context wiring, path-to-solution logging)
- Rag pipeline scaffolding (RagModule, RagService, RagController) with a test endpoint
- ADHD micro-quests and Weekly Planner integration paths (generateWeeklyPlanWithMicroQuests)
- Phase 2 MQATP mapping (PHASE2_FINAL.md) and Phase 2 demo artifacts
- Phase 2 end-to-end tests scaffold (phase2_e2e.spec.ts)

Go/No-Go Criteria:
- Demonstrable LMS ingest + aggregate flow (mock or real) and aggregated context surface
- Tutor scaffolding provides hints and a path to solution with logs
- Rag query endpoint returns sensible results and integrates with tutoring flow
- Weekly planner with micro-quests is generated and can be consumed by UI
- All Phase 2 MQATP criteria pass in CI

Demo Script: See phase2_demo_runbook.md and PHASE2_EXEC_DEMO.md for the live-run steps and expected outputs.
