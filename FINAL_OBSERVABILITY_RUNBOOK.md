# Observability Runbook — Phase 1-2 MVP

## Monitoring Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /monitoring/health | GET | System health check (status, uptime, version) |
| /monitoring/metrics | GET | System metrics (requests, latency, errors, costs) |
| /monitoring/alerts | GET | Recent alerts with severity (total, critical, warning) |
| /monitoring/signals | GET | Early warning signals (activation rate, retention, cost) |

## Early Warning Signals (12)

Tracked in `pilot/runbooks/early-warning-signals.json`:

1. Signup to Activation Rate (healthy > 40%)
2. D7 Retention Rate (healthy > 30%)
3. AI Cost Per Active User (healthy < $0.50)
4. Weekly Active Users
5. Error Rate
6. AI Latency (p95 < 500ms)
7. Fallback Rate (< 10%)
8. Cache Hit Rate (> 60%)
9. Planner Success Rate (> 98%)
10. API Uptime (> 99%)
11. Cost Per User ($0.50 cap)
12. Onboarding Completion (> 85%)

## Alert Severity Levels

- **info**: Informational, no action required
- **warning**: Monitor closely, investigate if persists
- **critical**: Immediate action required, potential rollback

## Alert FIFO Buffer

- Maximum 100 alerts stored
- Oldest alerts evicted first
- Alerts grouped by severity for triage

## Cost Tracking

- Per-user monthly spend tracked via CostGuardService
- Monthly reset on calendar month boundary
- Budget warning at 80% usage
- Hard block at 100% usage (fallback hints activated)
- Cache TTL: 3600 seconds (1 hour)
