Phase 2 Demo Runbook (Lean)
- Step 1: Migrate Phase 1 to Phase 2 UUP v2 staging DB (if not already done in CI)
- Step 2: Seed 10–100 synthetic users to stage realistic load; use cost guard rails
- Step 3: Run LMS ingest for Canvas (mock tokens) and ensure UUP updates
- Step 4: Issue Lean AI hints (<= 500ms); verify fallback triggers under latency
- Step 5: Run planner generation and verify weekly plans appear
- Step 6: Run a 100-user load test in CI; collect latency, errors, and cost metrics
- Step 7: Produce a Phase 2 demo video or CI-run output showing: onboarding, planning, hints, and a consistent UUP state
- Step 8: Attach evidence to Phase 2 PR
