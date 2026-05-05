# Daily Operations — Pilot Phase 2 Lean (UDB)

Morning checks (starts 09:00 local):
- Check pilot dashboard for today’s active users and critical alerts.
- Confirm Phase 2 maintenance windows and any kill-switch notes. 
- Confirm data ingestion pipelines are green (LMS ingest, planner updates, vector fallback).
- Check AI-lite service health and 500ms timeout guard status.
- Review incident queue and open tickets.

Daily metrics to review (on-call):
- TTV, WAU, AI usage rate, planner engagement, error rate.
- Latency distribution (p95/p99) for API and AI hints.
- AI cost per user and vector store usage.
- UUP updates per hour and data integrity flags.

Action thresholds (operators only):
- If API latency p95 > 200ms for more than 3 consecutive hours, escalate.
- If AI hints latency > 500ms or > 2 consecutive 500ms-timeouts, escalate.
- If cost per user > budget, trigger cost guard escalation.
- If onboarding drop-off > 5% in 24h, escalate.
- If planner engagement < 10% of users in 24h, escalate.

Ownership:
- Production Ops Lead owns daily checks.
- Platform Reliability Engineer handles incidents and mitigations.
- Growth Analyst tracks KPI metrics and communicates changes to Product.
