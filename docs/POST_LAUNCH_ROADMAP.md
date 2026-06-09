# UDB Post-Launch Roadmap

**Created:** 2026-06-09
**Current Version:** v21.2-client-ready
**Status:** GO — Client demos authorized

---

## Priority 1: This Week (Days 8-14)
- [ ] Complete 14-day burn-in (daily checks)
- [ ] Collect 5+ alpha family feedback responses
- [ ] Deploy to VPS with real TLS (DigitalOcean or EC2)
- [ ] Create client-specific demo accounts

## Priority 2: Weeks 2-3
- [ ] Email service (Nodemailer + SES) — password reset + welcome
- [ ] Stripe webhook configuration — enable escrow demo
- [ ] Unleash feature flag persistence — survive restarts
- [ ] OpenAI API key — upgrade AI tutor from hints to real responses

## Priority 3: Month 1-2
- [ ] LangGraph integration for Socratic tutor multi-turn conversations
- [ ] Google Classroom OAuth integration — school sales requirement
- [ ] MFA for parent accounts — enterprise security requirement
- [ ] Pinecone API key + RAG pipeline — curriculum-aligned tutoring
- [ ] Audit log Redis→PostgreSQL flush — compliance enhancement

## Priority 4: Month 2-4
- [ ] React Native mobile app shell — family adoption
- [ ] Multi-region DR on AWS — enterprise SLA
- [ ] ZAP full security scan + remediation
- [ ] Content moderation upgrade (Perspective API)
- [ ] Real Stripe Connect escrow flow

## Priority 5: Month 4-6+
- [ ] Desktop monitoring agent (Electron)
- [ ] Joon World WebXR environment
- [ ] Blockchain SBT minting (Polygon)
- [ ] LSTM biometric prediction model
- [ ] SOC 2 readiness assessment
- [ ] Institutional deployment (Clever/ClassLink)
- [ ] Snowflake BI pipeline
- [ ] CrewAI for Weekly Planner agent crew

---

## Architecture Evolution Path

| Phase | Architecture | Trigger |
|-------|-------------|---------|
| Current | Monolith + 5 Express stubs | <1000 users |
| Phase 2 | Monolith + independent Auth/AI services | >1000 users |
| Phase 3 | Full microservices on ECS Fargate | >10,000 users |
| Phase 4 | Multi-region + event-driven (Kafka) | Enterprise SLA |

The monolith-first approach was correct. Decompose only when scale demands it.