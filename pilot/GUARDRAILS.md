# Pilot Guardrails
- AI kill switch: if average AI hint cost per user exceeds budget in a day, disable hints for the day and show fallback
- Vector fallback: if vector store fails, use local vector store, with a UI notice
- Feature flags: enable/disable LMS integration, AI-lite hints, planner features individually per pilot phase
- Rollback plan: if pilot shows critical issues, revert to Phase 1 stable baseline and halt progression
