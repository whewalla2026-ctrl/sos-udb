# Architecture Scalability Review

**Date:** 2026-05-08
**System:** UDB Phase 3 Microservice Platform
**Reviewer:** SRE Architecture Analysis

---

## 1. Service Boundaries

### Current
- 5 services communicating via Express HTTP proxy (Gateway)
- Hardcoded host:port service discovery
- No service mesh, no circuit breakers

### Assessment
The decomposition into auth, planner, AI, and monitoring is appropriate for the domain.
Each service has a single responsibility. The gateway handles cross-cutting concerns
(auth, rate limiting, routing).

### Issues
- **Brittle service discovery**: Every service address is hardcoded in the gateway.
  Adding/removing instances requires code changes.
- **No circuit breaker**: A failing downstream service causes gateway errors.
  No fallback or degradation logic.
- **Chatty communication**: HTTP proxy adds ~5ms per hop. For high-throughput flows,
  consider gRPC or message-based communication.

### Recommendations
1. Replace hardcoded ports with environment variable-based discovery
2. Add circuit breaker pattern (e.g., Opossum) for downstream calls
3. Consider gRPC for inter-service communication at scale (>1,000 req/s)

---

## 2. Event-Driven Correctness

### Current
- Redis Pub/Sub for real-time delivery
- Redis Lists for persistence + consumption
- Events: 7 types

### Assessment
The event bus works correctly for the current scale but has fundamental
limitations inherent to Redis 3.0's capabilities.

### Issues
- **At-most-once delivery**: Pub/Sub messages are lost if no subscriber is active
- **No consumer groups**: Multiple instances of the same service both receive events
- **No exactly-once**: Events may be delivered multiple times or not at all
- **No replay**: Once an event is consumed from the List, it's gone

### Recommendations
1. Upgrade Redis to 5.0+ for Streams with consumer groups
2. Implement idempotent event handlers
3. Add event sourcing for audit-critical events

---

## 3. Queue Design Efficiency

### Current
- 4 Redis List-based queues with polling workers
- Exponential backoff retry
- Dead-letter queues

### Assessment
Adequate for low-throughput (≤10 jobs/s) workloads.
Polling interval (500ms-5s) limits throughput.

### Issues
- **Polling overhead**: Each worker polls Redis every 500ms, consuming CPU
- **No priority**: All jobs in a queue are equal — no urgent vs. background
- **No scheduling**: Jobs can't be delayed or scheduled for future execution

### Recommendations
1. Use Redis Streams with BLOCK option instead of polling
2. Consider RabbitMQ or Amazon SQS for production queue needs

---

## 4. Caching Strategy Effectiveness

### Current
- In-memory Maps for plans and AI budgets
- Redis TTL-based cache (via redis-service.js)

### Assessment
Effective for single-instance deployments. Hit rate of 80.4% is good.

### Issues
- **Per-instance caches**: Multiple instances don't share cache state
- **No eviction**: Plans and userSpend Maps grow unbounded
- **Stale data**: No cache invalidation mechanism

### Recommendations
1. Move all caching to Redis with TTL
2. Implement cache-aside pattern
3. Add max-size limits with LRU eviction for in-memory caches

---

## 5. Observability Completeness

### Current
- 15 health signals
- Prometheus /metrics endpoint
- Structured JSON logging
- Audit ring buffer (10k entries)

### Assessment
Adequate for debugging and basic monitoring. Insufficient for production
SLA monitoring and incident response.

### Issues
- **No retention**: Metrics reset on process restart
- **No dashboards**: No Grafana or visualization
- **No alerting**: Only HTTP polling for health checks
- **No tracing**: Correlation IDs don't capture span-level timing

### Recommendations
1. Deploy Prometheus + Grafana stack
2. Configure alert manager for PagerDuty/OpsGenie integration
3. Add OpenTelemetry instrumentation for distributed tracing
