# Incident Response — Lean Phase 2 Pilot

1) AI latency > 500ms
- Immediate action: switch to AI-lite hints path with fallback; cap concurrent hints; log incident.
- Fallback action: deliver simple non-AI hint with no latency risk; show a progress indicator.
- User communication: brief message indicating temporary AI slowdown and fallback hints.

2) Cost spike detected
- Immediate action: throttle AI hints and vector searches; notify on-call; activate per-user cap.
- Fallback action: reduce plan complexity and rely on planner-only flows.
- User communication: inform user we’re optimizing to reduce cost; offer a lighter flow.

3) Error rate > 2%
- Immediate action: pause non-critical features; reroute traffic to safe paths; roll back last release if needed.
- Fallback action: present a minimal planner-only path; capture telemetry.
- User communication: apologize for disruption; inform about ongoing fixes.

4) Users drop during onboarding
- Immediate action: re-run onboarding with a streamlined path; offer guided walkthrough.
- Fallback action: provide a one-page onboarding summary and quick-start wizard.
- User communication: remind about the value and offer to resume later.

5) Planner not being used
- Immediate action: auto-generate a simple 1-week starter plan for the user; pin on UI.
- Fallback action: recommend focusing tasks and present a minimal plan.
- User communication: notification that planner is available and prefilled for them.

Communication to stakeholders
- Runbook for on-call: 5-minute Slack/Teams briefing; incident log update; post-mortem link.
