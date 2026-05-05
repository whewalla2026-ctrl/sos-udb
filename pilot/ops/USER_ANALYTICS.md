# User Analytics — Engagement & Churn Signals (Lean Phase 2)

- Engaged user signals define engagement as a combined score 
- Engagement score = 0.4*(planner usage) + 0.4*(AI hints used) + 0.2*(on-time onboarding)
- Churn risk triggers: consecutive 3 days without planner use or AI hints, or a 50% drop in WAU week-over-week
- Signals: new user activity of 2+ planner blocks, 1+ AI hint session, planner edits, and a weekly plan acceptance

Thresholds
- Engagement score >= 0.6 = engaged; < 0.3 = at risk
- If WAU < 2 in a week and engagement low for 2 weeks, escalate to lifecycle team
