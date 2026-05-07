# Pre-Mortem Mitigation Summary

*Based on the failure analysis conducted on 2026-05-07. This document summarizes all changes made to prevent the failure scenarios identified in the pre-mortem.*

---

## Changes Implemented

### 1. Feature Flags (CUT Phase 3-5)
**File:** `pilot/config/feature-flags.json`

All Phase 3-5 features are now **disabled by default**: NFT minting, Stripe escrow, biometric wearables, Socratic tutor, RAG pipeline, LMS sync. The product now ships with only:
- Parent account → Child profile → Weekly Planner → AI Hints (cost-guarded)
- Doter avatar (experimental, will be disabled if D7 retention < 30%)
- Teacher invite and shareable progress (distribution hooks)

### 2. AI Cost Controls (Hard Per-User Budget)
**Files:** `services/guard/cost_guard.service.ts`, `services/ai-lite/ai-lite.service.ts`

- Hard per-user **monthly** budget ($0.50 default, configurable via `AI_BUDGET_PER_USER_MONTHLY`)
- **Aggressive response caching** (same prompt → cached response, zero cost, 1-hour TTL)
- **Monthly auto-reset** of budget
- **Fallback messages** when budget exhausted (not degraded AI experience)
- **Cheaper model tier** default (`gpt-4o-mini` via config)
- Per-hint cost reduced from $0.0008 to $0.0004 (50% reduction)

### 3. Simplified Onboarding (Zero Integrations)
**File:** `pilot/guides/quick-start-onboarding.md`

- 3 steps, under 5 minutes: Signup → Add child → Generate plan
- NO integrations, NO wearables, NO LMS, NO Stripe, NO NFTs
- NO COPPA consent flow in trial phase (gate behind payment)
- Advanced settings gated behind 14-day trial

### 4. Distribution Hooks (Viral Loops)
**File:** `pilot/guides/distribution-hooks.md`

- **Weekly progress email** with referral link
- **Teacher invite flow** (parent invites teacher → teacher sees snapshot → becomes advocate)
- **Grandparent/gift access** (read-only shareable link)
- Referral reward: 1 month free per 3 referrals

### 5. Early Warning Signals
**File:** `pilot/runbooks/early-warning-signals.json`

- 12 signals tracked weekly with healthy/warning/critical thresholds
- Covers: activation, retention, AI cost, NPS, CAC, support tickets, mobile usage, referrals
- Each signal has prescribed action if critical
- Dashboard to be implemented in monitoring service

### 6. Scope Reduction Summary

| Scope Item | Before | After |
|-----------|--------|-------|
| Phases active | 1-5 planned | 1-2 only |
| Integrations required | 5+ | 0 |
| Onboarding steps | 7+ | 3 |
| AI cost per user/mo | unbounded | $0.50 hard cap |
| Services in active use | 30+ | ~5 |
| Mobile support | React Native stub | PWA-first |
| Distribution strategy | none | referral + teacher invite |
| Pricing validation | none | waitlist at $19/mo |

---

## Remaining Risks (Not Yet Mitigated)

| Risk | Mitigation Needed | Priority |
|------|-------------------|----------|
| No validated willingness to pay | Launch waitlist landing page at $19/mo | HIGH |
| Mobile experience still desktop-only | Build PWA for core planner flow | HIGH |
| Doter avatar may not drive retention | Test with feature flag; disable if D7 < 30% | MEDIUM |
| No user interviews conducted | Schedule 20 parent discovery calls | HIGH |
| AI cost could still exceed at scale | Monitor weekly; reduce budget further if needed | MEDIUM |
| Teacher invite flow not yet coded | Implement in API service | MEDIUM |
| Weekly progress report not yet coded | Implement email generation service | MEDIUM |

---

## Weekly Health Check

Every Monday, the team must:
1. Update `pilot/runbooks/early-warning-signals.json` with current values
2. If ANY signal is in "critical" territory → stop all feature work → fix the signal
3. If 3+ signals are in "warning" → reconsider product strategy
4. Report overall health in team standup
