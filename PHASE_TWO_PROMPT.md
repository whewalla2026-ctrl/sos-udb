# OpenCode AI Phase Two Engineering Prompt

**Version:** 2.0
**Date:** 2026-05-16
**Status:** Ready for Implementation

---

## Overview

Phase Two transforms SOS-UDB into an AI-native developmental ecosystem with:

- **Auth0 OIDC** (replacing Firebase)
- **Unified User Profile (UUP) v4.0** with JSONB
- **TimescaleDB** for biometric time-series
- **Pinecone** vector database for AI
- **BullMQ** async job processing
- **Argon2id** password hashing
- **LangGraph** AI tutor
- **Socratic AI** with guardrails
- **SBT** (Soulbound Tokens) on Polygon
- **WebXR** (Joon World)
- **Future Self Simulator**

---

## Sprint Roadmap

| Sprint | Focus | Duration |
|--------|-------|----------|
| S0 | Phase One fixes + Auth0 migration | 2 weeks |
| S1 | UUP Engine + Audit Log | 2 weeks |
| S2 | Gamification + Doter | 2 weeks |
| S3 | Vision Proof-of-Work | 2 weeks |
| S4 | Planner + Conflict Engine | 2 weeks |
| S5 | Socratic Tutor (Cloud) | 2 weeks |
| S6 | Offline Tutor + Biometrics | 2 weeks |
| S7 | Escrow + Finance | 2 weeks |
| S8 | Social + SBT | 2 weeks |
| S9 | Agency + Safety | 2 weeks |
| S10 | Future Self Simulator | 2 weeks |
| S11 | QA Hardening + Compliance | 2 weeks |

**Total Duration:** 24 weeks

---

## Key Technical Changes

### Authentication
- Firebase → Auth0 OIDC
- JWT: 2h access + 24h refresh (HTTP-only cookies)
- COPPA VPC for < 13 years

### Database
- Prisma schema additions for UUP JSONB
- TimescaleDB hypertable for biometric_logs
- Pinecone integration for vector storage

### Security
- Argon2id password hashing (with bcrypt migration)
- Granular rate limiting per endpoint
- Full audit logging with SHA-256

### AI
- LangGraph-based tutor with scaffolding
- Pinecone RAG pipeline
- Mistral-7B offline mode
- Guardrails for child safety

---

## Phase One Issues to Resolve (Sprint S0)

| Issue | Description |
|-------|-------------|
| AUTH-01 | Remove Firebase, migrate to Auth0 OIDC |
| AUTH-02 | Implement 2h JWT + 24h refresh tokens |
| DATA-01 | Migrate User.profile → users_master.uup_data |
| DATA-02 | Add TimescaleDB for biometric_logs |
| DATA-03 | Add Pinecone client for AI |
| INFRA-01 | Granular rate limiting |
| INFRA-02 | Add BullMQ job processing |
| SEC-01 | Argon2id password hashing |

---

*Ready for Phase Two implementation*