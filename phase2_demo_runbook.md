Phase 2 Demo Runbook
- Start LMS sync ingest for a test user via POST /lms-sync/ingest
- Call /lms-sync/aggregate/:userId to fetch aggregated LMS context
- Call /ai-mentor/tutor with a test question and verify hints
- Call /rag/query with a test query and review results
- Call /planning/weekly?userId=<id> and /planning/weekly-with-qs?userId=<id> to view a plan with micro-quests
- Use __tests__/phase2_e2e.spec.ts to validate the key flows
