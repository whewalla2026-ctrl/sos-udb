Phase 2 Lean Pilot — Risk Summary

Critical Risks (must avoid):
- Data migration loss or irreversible changes
- AI latency/cost explosion beyond guardrails
- Vector store dependency risk (Pinecone) causing outages or cost spikes
- LMS adapter reliability (Canvas) affecting onboarding or progress
- Monitoring gaps leaving issues invisible

Moderate Risks (monitor and mitigate):
- Suboptimal onboarding UX slowing adoption
- Inadequate cost budgeting leading to near-term overruns
- Partial failures in the local vector store fallback path

Mitigation approach: Lock down scope, budgets, and guardrails; implement rollbacks; monitor all leaks aggressively; use a lean, observable pilot spine.
