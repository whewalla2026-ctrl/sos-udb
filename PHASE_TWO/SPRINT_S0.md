# Phase Two Implementation — Sprint S0

**Sprint:** S0 (Weeks 1-2)  
**Focus:** Phase One Fixes + Auth0 Migration  
**Status:** In Progress

---

## Phase One Issues Resolution

### AUTH-01: Remove Firebase → Auth0 OIDC

**Current State:** Firebase Auth + JWT dual system  
**Target State:** Auth0 OIDC only

**Actions:**
- [ ] Remove Firebase strategy dependencies
- [ ] Add Auth0 OIDC integration
- [ ] Implement COPPA VPC flow for <13
- [ ] Update frontend Apollo Client
- [ ] Run E2E tests (must pass)

### AUTH-02: JWT 2h + 24h Refresh

**Current State:** 15-minute JWT  
**Target State:** 2h access + 24h rotating refresh (HTTP-only cookies)

**Actions:**
- [ ] Update JWT module for 2h expiry
- [ ] Implement refresh token rotation
- [ ] HTTP-only secure cookie storage
- [ ] Update middleware

---

### DATA-01: UUP JSONB Migration

**Current State:** Flat User entity with profile: JSON  
**Target State:** users_master.uup_data JSONB with UUP v4.0 schema

**Actions:**
- [ ] Create Prisma migration
- [ ] Add GIN index on uup_data
- [ ] Implement backward compatibility
- [ ] Test rollback

### DATA-02: TimescaleDB for Biometrics

**Current State:** PostgreSQL only  
**Target State:** TimescaleDB hypertable for biometric_logs

**Actions:**
- [ ] Update docker-compose for TimescaleDB
- [ ] Create hypertable migration
- [ ] Monthly partitioning

### DATA-03: Pinecone Integration

**Current State:** No vector storage  
**Target State:** Pinecone client for AI RAG

**Actions:**
- [ ] Add Pinecone client package
- [ ] Create namespace strategy
- [ ] Embedding generation setup

---

### INFRA-01: Granular Rate Limiting

**Current State:** 600 req/min global  
**Target State:** Per-route configurable

**Actions:**
- [ ] Auth: 10 req/min per IP
- [ ] GraphQL mutations: 60 req/min per user
- [ ] File uploads: 10 req/min per user
- [ ] Webhooks: unlimited (signature verified)

### INFRA-02: BullMQ Setup

**Current State:** Redis only for cache  
**Target State:** BullMQ for async jobs

**Actions:**
- [ ] Add BullMQ dependencies
- [ ] Create QueueModule
- [ ] Define queues: vision, sbt-mint, escrow-payout, data-export, ai-inference
- [ ] DLQ retry logic

### SEC-01: Argon2id Password Hashing

**Current State:** bcrypt  
**Target State:** Argon2id (memory=64MB, iterations=3)

**Actions:**
- [ ] Add argon2 package
- [ ] Dual-read: verify bcrypt, re-hash Argon2id
- [ ] New registrations use Argon2id only

---

## Deliverables for Sprint S0

- [ ] Auth0 OIDC integration complete
- [ ] JWT: 2h access + 24h refresh tokens
- [ ] UUP JSONB schema v4.0
- [ ] TimescaleDB hypertable for biometrics
- [ ] Pinecone client configured
- [ ] Granular rate limiting
- [ ] BullMQ queues configured
- [ ] Argon2id hashing
- [ ] All 29 E2E tests passing

---

## Sprint S0 Completion Criteria

- Auth latency < 500ms P95
- Migration rollback tested
- All existing tests pass
- No breaking changes to API contracts