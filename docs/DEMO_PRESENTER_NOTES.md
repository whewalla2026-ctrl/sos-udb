# UDB Demo — Presenter Script (15 Minutes)

## Before Demo (2 min prep)
- Refresh browser (fixes Monaco font bug)
- Verify stack: `docker exec udb-api curl -sf http://localhost:4000/health`
- Open 3 browser tabs: Login, Dashboard, Grafana

## Opening (1 min)
"Let me show you what UDB does for families. I'll log in as Sarah, a parent of two kids — Leo (12) and Maya (14)."

## Login (1 min)
- Navigate to https://localhost/auth/login
- Accept self-signed cert warning: "In production, this would be a proper certificate."
- Login: sarah.demo@udb.app / DemoParent123!
- "Notice the JWT-based auth — no third-party dependency."

## Dashboard Tour (3 min)
- "Sarah sees her family at a glance — both kids' Doter companions, active quests, safety scores."
- Click through: /dashboard/quests → /dashboard/doter → /dashboard/safety
- "Leo's safety score is 92 — that's calculated from routine completion, sleep regularity, social engagement, and focus."

## AI Tutor Demo (2 min)
- Navigate to /dashboard/tutor
- "The tutor NEVER gives direct answers. It uses Socratic questioning."
- "After 3 unsuccessful rounds, it suggests asking a human mentor — this is by design."

## Doter Companion (2 min)
- Navigate to /dashboard/doter
- "Leo's Doter — Sparky — is at JUVENILE stage, Level 8, with 1,250 coins."
- "The Doter's mood reflects real-world behavior. Sleeping well = energetic Doter."

## Financial Literacy (2 min)
- Navigate to /dashboard/ventures
- "Leo's running a Lemonade Stand — his first business. Revenue tracking, escrow for payments."
- "Under 16, transactions are capped at $200. Parent must MFA-approve fund releases."

## Infrastructure (2 min)
- Switch to Grafana tab: http://localhost:3005
- "Full enterprise observability — Prometheus metrics, alert rules, request tracing."
- "This isn't a prototype. It's production infrastructure."

## Close (2 min)
- "What you're seeing runs on 18 Docker containers with 535+ automated tests."
- "We're in closed alpha with 10 families — 100% uptime over 5 days."
- "We can deploy a pilot for your organization within 30 days."

## Objection Handling
- "Is it COPPA compliant?" → "Yes — credit card micro-charge or gov ID verification for under-13. Built in."
- "Can we self-host?" → "Yes — Docker Compose or Kubernetes. Your data, your infrastructure."
- "What about data privacy?" → "GDPR data export and right-to-be-forgotten are implemented. Audit logs are immutable — database trigger prevents deletion."
- "How does it handle multiple schools?" → "Feature-flagged for institutional deployment. Clever/ClassLink OAuth integration is ready to enable."