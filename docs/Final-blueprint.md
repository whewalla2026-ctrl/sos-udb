\*\*UDB BUSINESS BLUEPRINT\*\*



Unified Developmental Backbone



Complete Module \& Function Reference



120 Use Cases • 14 Modules • 52 Services



Version 21.2 | June 2026 | Confidential



\# \*\*Executive Summary\*\*



This document is the definitive business and technical blueprint for the Unified Developmental Backbone (UDB). It maps all 120 use cases across 14 modules, providing the business justification, process flow, actors, service implementation, and frontend routes for every function in the system.



UDB is organized around four developmental pillars - Academic Achievement, Physical \& Mental Wellness, Social Development, and Financial Literacy - supported by an AI engine, compliance framework, gamification layer, and enterprise-grade infrastructure. The platform serves ages 6-23 with age-gated features, parental oversight, and institutional deployment capability.



As of version 21.2, 118 of 120 use cases are fully implemented (98.3%). The remaining 2 are intentionally deferred behind feature flags pending external partnership agreements (Clever/ClassLink institutional integration and Quest Store content marketplace).



\# \*\*Module Summary\*\*



| \*\*#\*\* | \*\*Module\*\*                           | \*\*Use Cases\*\* | \*\*Status\*\*       | \*\*Key Service\*\*          |

| ----- | ------------------------------------ | ------------- | ---------------- | ------------------------ |

| 1     | Authentication \& Authorization       | 12            | Complete         | auth.service.ts          |

| 2     | Unified User Profile (UUP)           | 8             | Complete         | users.service.ts         |

| 3     | Gamification \& Doter Companion       | 12            | Complete         | doter.service.ts         |

| 4     | AI Vision \& Evidence System          | 8             | Complete         | evidence.service.ts      |

| 5     | Weekly Planner \& Scheduling          | 8             | Complete         | weekly-plan.service.ts   |

| 6     | Socratic AI Tutor                    | 10            | Complete         | tutor.service.ts         |

| 7     | Financial Escrow \& Kid-Preneur Hub   | 8             | Complete         | marketplace.service.ts   |

| 8     | Blockchain \& Achievement Credentials | 6             | Complete         | blockchain.service.ts    |

| 9     | Social \& Messaging                   | 8             | Complete         | messaging.service.ts     |

| 10    | Safety \& Agency                      | 10            | Complete         | safety.service.ts        |

| 11    | Data \& Compliance                    | 10            | Complete         | gdpr.service.ts          |

| 12    | Proactive AI Features                | 6             | Complete         | feedback.service.ts      |

| 13    | Institutional \& Ecosystem            | 6             | 4/6 (2 deferred) | institutional.service.ts |

| 14    | Infrastructure \& DevOps              | 8             | Complete         | Docker Compose           |



\# \*\*Module 1: Authentication \& Authorization\*\*



\## \*\*Business Case\*\*



Secure, compliant identity management is the foundation of any platform serving minors. UDB implements COPPA-compliant parental consent, argon2id password hashing (OWASP recommended), role-based and attribute-based access control, immutable audit logging, and granular rate limiting. This module ensures regulatory compliance (COPPA, GDPR) while providing a seamless authentication experience for families with mixed age groups.



\## \*\*Process Flow\*\*



Parent Registration: Parent submits email + password (12+ chars) → System validates and hashes with argon2id → System creates family unit with UUID → COPPA verification triggered for under-13 children (credit card micro-charge or gov ID) → JWT access token (2h) + refresh token (24h) issued → Parent adds children to family → Each child inherits age-gated permissions via ABAC guard.



\## \*\*Actors\*\*



Parent, Child, Admin, Identity Provider, System



\## \*\*Services\*\*



auth.service.ts, jwt-token.service.ts, password.service.ts, rate-limit.service.ts, audit.service.ts, roles.guard.ts, gql-auth.guard.ts



\## \*\*Use Cases (12)\*\*



\### \*\*UC-001: Parent registration\*\*



Parent creates account with email + password. System validates strength (12+ chars, mixed case, digit, special), hashes with argon2id, creates family UUID, initiates email verification.



\*\*Service:\*\* auth.service.ts



\*\*Frontend:\*\* /auth/register



\### \*\*UC-002: Child account creation\*\*



Parent adds child to family from dashboard. System creates child profile linked to parent's family unit. Age determines feature access via ABAC guard.



\*\*Service:\*\* auth.service.ts



\*\*Frontend:\*\* /auth/register



\### \*\*UC-003: COPPA VPC verification\*\*



For children under 13, system requires parental consent via credit card micro-charge (\\$0.50 refunded) or government ID upload before account activation.



\*\*Service:\*\* auth.service.ts



\*\*Frontend:\*\* /auth/register



\### \*\*UC-004: JWT token issuance\*\*



On successful login, system issues access token (2h expiry, HS256) + refresh token (24h). Tokens contain userId, role, iat, exp claims.



\*\*Service:\*\* jwt-token.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-005: Multi-Factor Authentication\*\*



Parent enables TOTP-based MFA from settings. Required for sensitive operations: fund release, data deletion, child removal.



\*\*Service:\*\* auth.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-006: Immutable audit logging\*\*



Every authentication event, permission change, and data mutation creates an immutable audit record. PostgreSQL trigger prevents DELETE/UPDATE on audit\_logs table.



\*\*Service:\*\* audit.service.ts



\*\*Frontend:\*\* /dashboard/admin/audit



\### \*\*UC-007: RBAC guard enforcement\*\*



Role-Based Access Control gate checks user role (PARENT, CHILD, ADMIN, TEACHER) before allowing access to protected resolvers and routes.



\*\*Service:\*\* roles.guard.ts



\*\*Frontend:\*\* -



\### \*\*UC-008: ABAC guard (age/ownership)\*\*



Attribute-Based Access Control checks child age, resource ownership, and family membership. Under-13 cannot access messaging; under-16 has financial limits.



\*\*Service:\*\* gql-auth.guard.ts



\*\*Frontend:\*\* -



\### \*\*UC-009: Permissions matrix\*\*



Cross-references role + age + ownership to determine exact capabilities. ADMIN sees all; PARENT sees family; CHILD sees own data + age-gated features.



\*\*Service:\*\* roles.guard.ts



\*\*Frontend:\*\* -



\### \*\*UC-010: Argon2id password hashing\*\*



All passwords hashed with argon2id (memory=65536, time=3, parallelism=1). SHA-256 fallback for legacy credentials with auto-upgrade on successful login. 14/14 dedicated tests.



\*\*Service:\*\* password.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-011: Granular rate limiting\*\*



Per-route rate limiting via Redis sliding window. Auth endpoints: 30 req/15min. GraphQL mutations: 60/min. Queries: 120/min. Trust proxy enabled for accurate IP behind Nginx.



\*\*Service:\*\* rate-limit.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-012: Session management\*\*



JWT-based sessions with token rotation on refresh. Logout blacklists the JTI in Redis. Post-logout requests with old tokens are rejected.



\*\*Service:\*\* jwt-token.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 2: Unified User Profile (UUP)\*\*



\## \*\*Business Case\*\*



The UUP is the "backbone" of UDB - a persistent, evolving profile that tracks each child's development across all four pillars (academic, wellness, social, financial). Unlike competing platforms that lose context between sessions, UDB maintains continuity from age 6 through 23. The UUP enables personalized AI recommendations, cross-pillar insights (e.g., sleep affects academic performance), and family-level analytics.



\## \*\*Process Flow\*\*



Profile Lifecycle: Account creation → UUP initialized with 4-pillar JSONB structure → Every activity/quest/biometric event updates relevant pillar scores → UUP Sync Engine triggers cross-pillar logic (e.g., low sleep → Doter becomes 'Sluggish') → AI reads UUP to generate personalized weekly plans → Parent views unified dashboard showing all pillars → Profile persists and evolves over years.



\## \*\*Actors\*\*



Parent, Child, System (UUP Sync Engine)



\## \*\*Services\*\*



users.service.ts, family.service.ts, uup-sync.service.ts, gql-auth.guard.ts



\## \*\*Use Cases (8)\*\*



\### \*\*UC-013: Profile creation\*\*



System creates Unified User Profile on registration with 4-pillar JSONB structure: gamification (level, XP, Doter state), academic (LMS links, skill gaps), biometric (focus score, sleep logs), entrepreneurship (ventures, wallet balance).



\*\*Service:\*\* users.service.ts



\*\*Frontend:\*\* /auth/register



\### \*\*UC-014: Profile editing\*\*



Users update display name, avatar, preferences. Parent can edit child profiles. Version history tracked for activity instructions.



\*\*Service:\*\* users.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-015: Avatar and display name\*\*



Each user selects a display name and avatar. Children's avatars appear in Joon World pods and on the family dashboard.



\*\*Service:\*\* users.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-016: Role-based profile views\*\*



Parent sees all family members' full profiles. Child sees own profile. Admin sees all users. Teacher sees anonymized cohort data.



\*\*Service:\*\* users.service.ts



\*\*Frontend:\*\* /dashboard



\### \*\*UC-017: Family linking\*\*



Parent links children to family unit. System creates bidirectional relationship. Family ID used for cross-member analytics.



\*\*Service:\*\* family.service.ts



\*\*Frontend:\*\* /dashboard/family



\### \*\*UC-018: Parental controls per child\*\*



Parent configures per-child settings: screen time limits, content access, financial limits, messaging permissions, bedtime enforcement.



\*\*Service:\*\* family.service.ts



\*\*Frontend:\*\* /dashboard/family



\### \*\*UC-019: Age-based feature access\*\*



System checks child's age on every request. Under 13: no voice chat, no marketplace selling. Under 16: \\$200 transaction limit. 16-18: \\$500 limit. 18+: full access.



\*\*Service:\*\* gql-auth.guard.ts



\*\*Frontend:\*\* -



\### \*\*UC-020: Multi-tenant user isolation\*\*



Each family's data is isolated. GraphQL resolvers filter by family ID. No cross-family data leakage. Institutional deployments use organization-level tenancy.



\*\*Service:\*\* gql-auth.guard.ts



\*\*Frontend:\*\* -



\# \*\*Module 3: Gamification \& Doter Companion\*\*



\## \*\*Business Case\*\*



Gamification is UDB's primary engagement driver. The Doter companion - a virtual pet whose mood and evolution reflect real-world behavior - creates an emotional connection that drives daily engagement. Children earn points through quest completion, maintain streaks for consistency, earn badges for milestones, and spend points in the marketplace. This module transforms developmental activities from "chores" into a game.



\## \*\*Process Flow\*\*



Engagement Loop: Child opens app → Sees Doter's current mood (driven by sleep + activity data) → Views available quests → Completes quest → Submits evidence → AI vision scores evidence → Points awarded → Doter gains XP → Streak counter increments → On level-up: Doter evolves (Egg → Hatchling → Juvenile → Adult) → Achievement badge earned → Points spendable in marketplace.



\## \*\*Actors\*\*



Child (primary), Parent (approver), System (gamification engine)



\## \*\*Services\*\*



doter.service.ts, gamification.service.ts, points.service.ts, quests.service.ts, coop-quest.service.ts



\## \*\*Use Cases (12)\*\*



\### \*\*UC-021: Doter companion state machine\*\*



Each child has a Doter with 5 states: Energetic (sleep >8h + activity complete), Neutral (baseline), Sluggish (sleep <6h), Evolving (level-up in progress), Resting (bedtime). State driven by biometric and activity data.



\*\*Service:\*\* doter.service.ts



\*\*Frontend:\*\* /dashboard/doter



\### \*\*UC-022: Doter evolution (levels)\*\*



Doter evolves through 4 stages: Egg (Level 1-5), Hatchling (6-10), Juvenile (11-20), Adult (21+). Each evolution triggers a celebration animation and achievement badge.



\*\*Service:\*\* doter.service.ts



\*\*Frontend:\*\* /dashboard/doter



\### \*\*UC-023: Streak tracking\*\*



System tracks consecutive days of activity completion per pillar (Academic, Biometric, Life Skills, Social). Streaks drive bonus points and Doter mood boosts.



\*\*Service:\*\* gamification.service.ts



\*\*Frontend:\*\* /dashboard/achievements



\### \*\*UC-024: Points ledger\*\*



Transparent, immutable ledger of all points earned (quest completion, streak bonuses, manual parent awards) and spent (marketplace, Doter accessories). Mimics a bank statement for financial literacy.



\*\*Service:\*\* points.service.ts



\*\*Frontend:\*\* /dashboard/bank



\### \*\*UC-025: Quest completion flow\*\*



Child selects quest → completes activities → submits evidence → AI or parent approves → XP + coins awarded → quest status moves to COMPLETED → linked goals update progress.



\*\*Service:\*\* quests.service.ts



\*\*Frontend:\*\* /dashboard/quests



\### \*\*UC-026: Achievement badges\*\*



Badges awarded for milestones: first quest, 7-day streak, Doter evolution, 100 points, first business venture. Displayed in profile and Joon World pod.



\*\*Service:\*\* gamification.service.ts



\*\*Frontend:\*\* /dashboard/achievements



\### \*\*UC-027: Level progression\*\*



XP accumulates across all activities. Level thresholds increase progressively. Higher levels unlock new quest types, marketplace items, and Doter customization.



\*\*Service:\*\* gamification.service.ts



\*\*Frontend:\*\* /dashboard/achievements



\### \*\*UC-028: Streak freeze mechanic\*\*



Children can earn or purchase (with points) streak freezes that protect streaks during illness or travel. Auto-freeze triggers when biometric data indicates illness (feature flagged).



\*\*Service:\*\* gamification.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-029: Co-op quests\*\*



Multiple children collaborate on shared quests within Joon World study pods. Progress pooled. Requires mutual friend connection. Feature flag: co-op-quests.



\*\*Service:\*\* coop-quest.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-030: Quest difficulty scaling\*\*



System adjusts quest difficulty based on child's mastery level. Skill gap analysis (UC-102) informs difficulty selection. Too easy = less XP; too hard = frustration detection.



\*\*Service:\*\* quests.service.ts



\*\*Frontend:\*\* /dashboard/quests



\### \*\*UC-031: Weekly challenge system\*\*



System generates weekly themed challenges (e.g., "Math Marathon", "Reading Rainbow") with bonus XP multipliers. Drives engagement beyond individual quests.



\*\*Service:\*\* quests.service.ts



\*\*Frontend:\*\* /dashboard/quests



\### \*\*UC-032: Gamification notifications\*\*



BullMQ-driven notifications for: streak about to break, quest deadline approaching, Doter evolution ready, achievement unlocked, weekly challenge available.



\*\*Service:\*\* gamification.service.ts



\*\*Frontend:\*\* /dashboard/notifications



\# \*\*Module 4: AI Vision \& Evidence System\*\*



\## \*\*Business Case\*\*



The evidence system transforms UDB from a task tracker into a verified learning platform. Children submit photo/video proof of quest completion. AI vision scoring automates the approval process: scores ≥85% auto-approve, 60-84% go to parent review queue, <60% receive constructive feedback with a 1-hour retry cooldown. This creates a "digital scrapbook" of growth while ensuring honest engagement.



\## \*\*Process Flow\*\*



Evidence Lifecycle: Child completes quest activity → Takes photo/video of result → Uploads via evidence gallery → System stores in S3 (AES-256 encrypted) → AI vision service analyzes content → Score ≥85%: auto-approve + points awarded → Score 60-84%: queued for parent review → Score <60%: constructive rejection + retry after 1h cooldown → Evidence stored permanently as growth record.



\## \*\*Actors\*\*



Child (submitter), AI Vision (scorer), Parent (reviewer), System



\## \*\*Services\*\*



evidence.service.ts, vision.service.ts, s3.service.ts



\## \*\*Use Cases (8)\*\*



\### \*\*UC-033: Photo evidence upload\*\*



Child captures photo of completed activity (homework, art project, cleaned room) and uploads via the evidence gallery. System generates thumbnail and stores original in S3.



\*\*Service:\*\* evidence.service.ts



\*\*Frontend:\*\* /dashboard/evidence



\### \*\*UC-034: Video evidence upload\*\*



Child records short video (max 30 seconds) demonstrating activity completion. System transcodes for storage and generates preview frame.



\*\*Service:\*\* evidence.service.ts



\*\*Frontend:\*\* /dashboard/evidence



\### \*\*UC-035: AI vision scoring\*\*



AI analyzes uploaded evidence against quest requirements. Scoring considers: relevance to quest, quality indicators, completion signals. Returns 0-100 score with reasoning.



\*\*Service:\*\* vision.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-036: Auto-approve (≥85%)\*\*



Evidence scoring 85% or above is automatically approved. Points and XP awarded immediately. Parent notified of completion but no action required.



\*\*Service:\*\* evidence.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-037: Parent review queue (60-84%)\*\*



Evidence scoring 60-84% enters the parent review queue. Parent sees the evidence, AI score, and reasoning. Parent can approve (awarding points) or request revision.



\*\*Service:\*\* evidence.service.ts



\*\*Frontend:\*\* /dashboard/notifications



\### \*\*UC-038: Rejection + feedback (<60%)\*\*



Evidence below 60% is rejected with constructive AI feedback (e.g., "Great start! The drawing needs more detail in the background"). 1-hour cooldown before retry.



\*\*Service:\*\* evidence.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-039: Retry timer (1h cooldown)\*\*



After rejection, system enforces a 1-hour cooldown before the child can resubmit. Prevents frustration-driven spam and encourages reflection.



\*\*Service:\*\* evidence.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-040: S3 secure storage\*\*



All evidence files stored in S3 with AES-256-GCM encryption at rest. Access controlled via signed URLs with expiration. COPPA-compliant data handling.



\*\*Service:\*\* s3.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 5: Weekly Planner \& Scheduling\*\*



\## \*\*Business Case\*\*



The Weekly Planner solves "parental cognitive load" - the #1 complaint from parents in market research. Instead of manually planning each child's week, the AI generates a balanced schedule based on the child's chronotype (when they focus best), academic workload, screen time limits, and physical activity requirements. Parents approve the draft, lock specific time slots, and the plan drives the Doter's weekly quest tracker.



\## \*\*Process Flow\*\*



Planning Ritual: Parent initiates "Sunday Planning" → AI fetches child's skill gaps + calendar + chronotype data → AI generates balanced "Draft Week" prioritizing under-practiced pillars → System checks for conflicts using Conflict Resolution Engine → Parent reviews, adjusts, locks specific slots → Parent approves → Plan becomes active → Doter's weekly quests update → Daily notifications remind child of scheduled activities.



\## \*\*Actors\*\*



Parent (planner), AI Mentor (generator), Child (executor), System



\## \*\*Services\*\*



weekly-plan.service.ts, planner.service.ts, chronotype-cron.service.ts, activities.service.ts



\## \*\*Use Cases (8)\*\*



\### \*\*UC-041: AI-generated weekly plan\*\*



AI analyzes skill gaps, calendar availability, and parent preferences to generate a 7-day plan. Prioritizes pillars with <20% practice time. Balances academic, physical, social, and creative activities.



\*\*Service:\*\* weekly-plan.service.ts



\*\*Frontend:\*\* /dashboard/weekly-plan



\### \*\*UC-042: Parent approval workflow\*\*



Generated plan starts in DRAFT status. Parent reviews, can drag/drop activities, add/remove items. Only becomes ACTIVE after parent clicks "Approve Plan."



\*\*Service:\*\* weekly-plan.service.ts



\*\*Frontend:\*\* /dashboard/weekly-plan



\### \*\*UC-043: Parent-locked time slots\*\*



Parent can lock specific time blocks (e.g., "3-4pm = Piano practice") that the AI cannot reschedule. Locked slots appear with a lock icon.



\*\*Service:\*\* weekly-plan.service.ts



\*\*Frontend:\*\* /dashboard/weekly-plan



\### \*\*UC-044: Screen time limits\*\*



Parent sets daily screen time limits per child. Planner ensures scheduled activities don't exceed limits. AI suggests offline alternatives when screen time is maxed.



\*\*Service:\*\* weekly-plan.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-045: Chronotype-aware scheduling\*\*



System identifies child's cognitive peak times from historical activity data. Schedules demanding tasks (math, coding) during high-focus periods. Creative tasks during relaxed periods.



\*\*Service:\*\* chronotype-cron.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-046: Plan draft before activation\*\*



All plans start as drafts. Multiple revisions allowed. Parent can ask AI to regenerate with different priorities. Only approved plans trigger notifications and quest updates.



\*\*Service:\*\* weekly-plan.service.ts



\*\*Frontend:\*\* /dashboard/weekly-plan



\### \*\*UC-047: Weekly schedule view\*\*



Calendar view showing all scheduled activities across the week. Color-coded by pillar (blue=academic, green=wellness, purple=social, gold=financial). Drag-and-drop rescheduling.



\*\*Service:\*\* planner.service.ts



\*\*Frontend:\*\* /dashboard/calendar



\### \*\*UC-048: Activity suggestions\*\*



AI suggests activities based on skill gaps, time of day, available resources, and child's interests. Parent can accept, modify, or dismiss suggestions.



\*\*Service:\*\* activities.service.ts



\*\*Frontend:\*\* /dashboard/academic



\# \*\*Module 6: Socratic AI Tutor\*\*



\## \*\*Business Case\*\*



The AI Tutor is UDB's marquee differentiator. Unlike Khan Academy (which gives exercises) or ChatGPT (which gives answers), UDB's tutor uses Socratic questioning to guide children to discover answers themselves. After 3 unsuccessful rounds, it detects frustration and suggests a human mentor. Per-user budget tracking prevents cost overruns (\\$0.0004/hint, \\$0.50/month cap). All tutoring sessions are logged for parental review.



\## \*\*Process Flow\*\*



Tutoring Session: Child clicks "Help Me" on an assignment → System retrieves context from curriculum database → AI identifies the "Point of Confusion" → AI provides a scaffolding hint (never the answer) → Child responds → AI evaluates response → If correct: celebrate + log mastery gain → If incorrect (round 1-2): provide different hint angle → If incorrect (round 3): detect frustration → Offer encouragement + suggest human mentor → Log entire "Path to Solution" for parent review.



\## \*\*Actors\*\*



Child (learner), AI Tutor (guide), Parent (reviewer), System



\## \*\*Services\*\*



tutor.service.ts, ai.service.ts



\## \*\*Use Cases (10)\*\*



\### \*\*UC-049: Ask a question (all subjects)\*\*



Child types a question in any subject (math, reading, science, history). System routes to AI tutor with subject context and child's proficiency level.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* /dashboard/tutor



\### \*\*UC-050: Socratic questioning\*\*



AI NEVER reveals the direct answer. Instead, asks guiding questions: "What happens when you multiply both sides by -1?" "What clue does the first paragraph give you?"



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-051: Frustration detection (3 rounds)\*\*



After 3 consecutive incorrect responses, system flags the interaction as "frustration detected." Triggers a tone change in the AI and an encouragement message.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-052: Encourage after frustration\*\*



AI switches from "question" mode to "encouragement" mode: "This is a tough one! You're making great progress by trying. Let's look at it from a different angle."



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-053: Mentor referral suggestion\*\*



After frustration detection, AI suggests: "Would you like to ask your parent or a human mentor for help with this one?" Links to family messaging.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-054: Math subject hints\*\*



Specialized math tutoring with step-by-step scaffolding: fractions, algebra, geometry, statistics. Uses visual representations where possible.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* /dashboard/tutor



\### \*\*UC-055: Reading subject guidance\*\*



Reading comprehension guidance: identifies main idea, asks about character motivations, prompts inference from context clues. Age-appropriate vocabulary.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* /dashboard/tutor



\### \*\*UC-056: Science inquiry support\*\*



Guides scientific thinking: hypothesis formation, variable identification, data interpretation. Encourages experimentation over memorization.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* /dashboard/tutor



\### \*\*UC-057: Graded assignment refusal\*\*



If child submits a question that appears to be from a graded assignment (detected via keywords), AI refuses to help and suggests asking the teacher. Academic integrity protection.



\*\*Service:\*\* tutor.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-058: AI budget tracking\*\*



Per-user budget: \\$0.0004 per hint, \\$0.50 monthly cap. System tracks usage, warns at 80% budget, blocks at 100%. Parent can increase limit. Prevents cost overruns.



\*\*Service:\*\* ai.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 7: Financial Escrow \& Kid-Preneur Hub\*\*



\## \*\*Business Case\*\*



UDB transforms financial literacy from a theoretical concept into real-world practice. Children create ventures (lemonade stands, tutoring services), list them in the marketplace, receive real payments held in parent-supervised escrow, submit proof of delivery, and receive funds after parent approval. Age-gated limits (\\$200 for under-16, \\$500 for 16-18) and parent MFA for fund release ensure safety.



\## \*\*Process Flow\*\*



Venture Lifecycle: Student initiates "New Venture" → AI Business Coach guides through plan (Problem, Solution, Market, Pricing) → AI validates pricing logic (Revenue > Cost) → Parent reviews and authorizes → Venture listed in marketplace → Buyer purchases service → Funds held in Platform Escrow (Stripe Connect) → Student submits Proof of Delivery → Parent reviews and clicks "Release Funds" (requires MFA) → Stripe transfers to Student's Business Vault → Transaction logged in Points Ledger.



\## \*\*Actors\*\*



Student (seller), Buyer (peer/parent), Parent (escrow manager), AI Business Coach, System



\## \*\*Services\*\*



marketplace.service.ts, escrow.service.ts, entrepreneurship.service.ts, billing.service.ts



\## \*\*Use Cases (8)\*\*



\### \*\*UC-059: Marketplace listing\*\*



Student creates a listing with title, description, price, and category. System validates against age-appropriate content guidelines. Listing visible to approved buyers.



\*\*Service:\*\* marketplace.service.ts



\*\*Frontend:\*\* /dashboard/marketplace



\### \*\*UC-060: Escrow hold on purchase\*\*



When a buyer purchases a service, system holds funds via Stripe Connect in platform escrow. Neither party can access funds until proof of delivery is verified.



\*\*Service:\*\* escrow.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-061: Proof-of-delivery submission\*\*



Student submits evidence that the service was delivered (photo, video, document). Uses the same evidence system as quest completion (UC-033 through UC-039).



\*\*Service:\*\* entrepreneurship.service.ts



\*\*Frontend:\*\* /dashboard/ventures



\### \*\*UC-062: Parent release of funds\*\*



Parent reviews proof of delivery and clicks "Release Funds." System requires MFA re-verification. On approval, Stripe transfers funds to student's Business Vault.



\*\*Service:\*\* escrow.service.ts



\*\*Frontend:\*\* /dashboard/bank



\### \*\*UC-063: Age-based transaction limits\*\*



Under 16: maximum \\$200 per transaction. Ages 16-18: maximum \\$500. Over 18: no limit (with parent override option). Limits enforced at the escrow service level.



\*\*Service:\*\* escrow.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-064: Stripe Connect integration\*\*



Full Stripe Connect implementation for marketplace payments. Platform fee (2.5%), automated payouts, dispute handling, 1099 reporting for US users.



\*\*Service:\*\* billing.service.ts



\*\*Frontend:\*\* /dashboard/billing



\### \*\*UC-065: Idempotent payouts\*\*



All payout operations use idempotency keys to prevent double payments. Retry-safe design for network failures during fund release.



\*\*Service:\*\* billing.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-066: Transaction history\*\*



Complete financial history showing all credits (sales, quest rewards, parent awards) and debits (marketplace purchases, Doter accessories). Bank statement format builds financial literacy.



\*\*Service:\*\* escrow.service.ts



\*\*Frontend:\*\* /dashboard/bank



\# \*\*Module 8: Blockchain \& Achievement Credentials\*\*



\## \*\*Business Case\*\*



UDB uses Soulbound Tokens (SBTs) - non-transferable blockchain credentials - to create permanent, verifiable achievement records. When a child completes a major goal, the parent approves SBT minting, creating an on-chain record that follows the child through their educational journey. This is designed for future integration with LinkedIn, Coursera, and professional credential networks.



\## \*\*Process Flow\*\*



SBT Lifecycle: Child completes 100% of a goal → System generates Goal Completion Certificate (PDF) → Parent receives minting approval request → Parent approves (MFA required) → System submits SBT mint transaction to Polygon → On-chain credential stored with IPFS metadata → SBT appears in child's Achievement Gallery → SBT displayed in Joon World 3D pod → Audit log records on-chain hash for immutability.



\## \*\*Actors\*\*



Child, Parent (approver), System, Blockchain



\## \*\*Services\*\*



blockchain.service.ts, goals.service.ts, audit.service.ts



\## \*\*Use Cases (6)\*\*



\### \*\*UC-067: SBT minting on goal completion\*\*



When a goal reaches 100% progress, system queues an SBT minting request via BullMQ sbt-mint queue. Contains: achievement metadata, child ID, timestamp, skill category.



\*\*Service:\*\* blockchain.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-068: Parent signature for minting\*\*



SBT minting requires parent approval. Parent receives notification with achievement details. Approval requires MFA re-verification for security.



\*\*Service:\*\* blockchain.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-069: On-chain credential storage\*\*



SBT minted on Polygon with metadata stored on IPFS. Non-transferable (Soulbound). Contains: achievement name, date, skill category, issuing organization.



\*\*Service:\*\* blockchain.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-070: SBT gallery display\*\*



Child's Achievement page shows all earned SBTs with visual badges. Each SBT links to its on-chain record for third-party verification.



\*\*Service:\*\* goals.service.ts



\*\*Frontend:\*\* /dashboard/achievements



\### \*\*UC-071: Immutable audit linked to on-chain hash\*\*



Each SBT minting creates an audit log entry with the transaction hash, linking the on-platform record to the on-chain credential permanently.



\*\*Service:\*\* audit.service.ts



\*\*Frontend:\*\* /dashboard/admin/audit



\### \*\*UC-072: Blockchain unavailable fallback\*\*



If blockchain network is unreachable, system queues the minting for retry. Achievement is still recorded on-platform. Retry attempts follow exponential backoff.



\*\*Service:\*\* blockchain.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 9: Social \& Messaging\*\*



\## \*\*Business Case\*\*



Safe social interaction is critical for child development. UDB provides age-gated communication: text chat for all ages (with content filtering), voice chat for 13+ only, and collaborative study pods (Joon World) where up to 4 friends can learn together. All communication is monitored for inappropriate content, and parental approval is required for under-13 children to join pods.



\## \*\*Process Flow\*\*



Social Interaction: Child sends message → Content filter checks for inappropriate language/PII/bullying → If clean: delivered to recipient → If flagged: blocked + parent notified → For Joon World: child requests to join pod → If under 13: parent approval required → Up to 4 friends per pod → Collaborative quests available within pod → SBT gallery visible in 3D environment.



\## \*\*Actors\*\*



Child (sender/recipient), Parent (moderator), System (content filter)



\## \*\*Services\*\*



messaging.service.ts, joon-world.service.ts, coop-quest.service.ts



\## \*\*Use Cases (8)\*\*



\### \*\*UC-073: Text chat (all ages)\*\*



Filtered text messaging between family members and approved friends. System scans every message for profanity, PII, bullying keywords, and external links.



\*\*Service:\*\* messaging.service.ts



\*\*Frontend:\*\* /dashboard/messages



\### \*\*UC-074: Voice chat (13+)\*\*



Real-time voice communication for children 13 and older. ABAC guard enforces age gate. Recording available for parental review on request.



\*\*Service:\*\* messaging.service.ts



\*\*Frontend:\*\* /dashboard/messages



\### \*\*UC-075: Joon World study pods\*\*



Virtual study environments where 2-4 friends collaborate on quests. Pods feature shared whiteboards, resource sharing, and collaborative progress tracking.



\*\*Service:\*\* joon-world.service.ts



\*\*Frontend:\*\* /dashboard/joon-world



\### \*\*UC-076: Pod join approval (<13)\*\*



Children under 13 cannot join Joon World pods without parent approval. Parent receives notification with pod details and participant list before granting access.



\*\*Service:\*\* joon-world.service.ts



\*\*Frontend:\*\* /dashboard/family



\### \*\*UC-077: Content filtering\*\*



AI-powered content moderation on all text communications. Detects: profanity, personally identifiable information, bullying language, external URLs, phone numbers.



\*\*Service:\*\* messaging.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-078: SBT gallery in 3D pod\*\*



Each child's earned SBTs are displayed as 3D badges in their Joon World pod. Other pod members can view achievements, encouraging friendly competition.



\*\*Service:\*\* joon-world.service.ts



\*\*Frontend:\*\* /dashboard/joon-world



\### \*\*UC-079: Up to 4 friends per pod\*\*



Pods limited to 4 participants for quality social interaction. Fifth member sees "Pod Full" message with option to create a new pod.



\*\*Service:\*\* joon-world.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-080: Collaborative quests in pod\*\*



Pod members work together on shared quests. Progress is pooled. Completion requires all members to contribute. Encourages teamwork and accountability.



\*\*Service:\*\* coop-quest.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 10: Safety \& Agency\*\*



\## \*\*Business Case\*\*



The Safety Score is a composite 0-100 indicator computed from routine completion (25%), sleep regularity (20%), social engagement (15%), focus consistency (30%), and biometric stability (10%). When a child's score drops below 40, parents receive automatic alerts. This proactive system detects wellbeing issues before they become crises.



\## \*\*Process Flow\*\*



Safety Monitoring: System continuously aggregates data from all pillars → Routine completion score calculated from quest/activity data → Sleep score from biometric inputs → Social score from messaging/pod activity → Focus score from screen time patterns → Biometric score from wearable data (flagged) → Composite Safety Score computed → If score <40: push notification to parent → Parent views safety dashboard with component breakdown → System suggests intervention activities.



\## \*\*Actors\*\*



System (monitoring engine), Parent (responder), Child (subject)



\## \*\*Services\*\*



safety.service.ts, biometric.service.ts



\## \*\*Use Cases (10)\*\*



\### \*\*UC-081: Safety Score computation\*\*



Composite 0-100 score from 5 weighted components. Recalculated daily or on significant events. Stored in TimescaleDB for time-series analysis.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* /dashboard/safety



\### \*\*UC-082: Routine completion (25%)\*\*



Measures consistency of daily activity completion across all pillars. 100% = all scheduled activities done. Declining trend triggers early warning.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-083: Sleep regularity (20%)\*\*



Tracks sleep duration and consistency from biometric data. 8+ hours with consistent bedtime = high score. Irregular patterns lower the score.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-084: Social engagement (15%)\*\*



Measures frequency and quality of social interactions: messaging, pod participation, co-op quests. Isolation patterns (no social activity for 7+ days) flag a concern.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-085: Biometric stability (10%)\*\*



Heart rate variability, stress indicators, and activity levels from wearable devices. Feature flagged (biometric-feed) until HealthKit/Google Fit integration complete.



\*\*Service:\*\* biometric.service.ts



\*\*Frontend:\*\* /dashboard/biometric



\### \*\*UC-086: Focus consistency (30%)\*\*



Measures screen time patterns, app usage categorization (productive vs entertainment), and attention span during academic activities. Feature flagged (electron-agent) for desktop monitoring.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-087: Low score notification (<40)\*\*



When Safety Score drops below 40, system sends immediate push notification to parent with score breakdown and suggested intervention activities.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* /dashboard/notifications



\### \*\*UC-088: Parental safety dashboard\*\*



Parent views real-time safety scores for all children in the family. Historical trends, component breakdowns, and AI-suggested interventions.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* /dashboard/family



\### \*\*UC-089: COPPA guardian consent flow\*\*



Integrated with UC-003. All safety-related data collection for under-13 requires verified parental consent. Consent can be revoked at any time.



\*\*Service:\*\* auth.service.ts



\*\*Frontend:\*\* /auth/register



\### \*\*UC-090: Emergency contacts\*\*



Parent configures emergency contacts (school counselor, doctor, trusted adult). Safety Score critical alerts (<20) can optionally notify emergency contacts.



\*\*Service:\*\* safety.service.ts



\*\*Frontend:\*\* /dashboard/safety



\# \*\*Module 11: Data \& Compliance\*\*



\## \*\*Business Case\*\*



UDB is built for regulatory compliance from the ground up. COPPA (Children's Online Privacy Protection Act) governs under-13 data. GDPR grants European users data portability and deletion rights. The immutable audit log ensures every action is traceable. This module is the reason enterprise and institutional buyers can adopt UDB without legal risk.



\## \*\*Process Flow\*\*



Data Export: User requests export from Settings → System generates JSON-LD file with all user data across all pillars → 7-day download link created → Link sent via notification → User downloads. Data Deletion: User requests deletion → System requires MFA re-verification → Cascading delete across all services (quests, evidence, messages, financial records) → Audit log records deletion event (the log itself is immutable) → Confirmation notification sent.



\## \*\*Actors\*\*



User (requester), System (processor), Admin (auditor)



\## \*\*Services\*\*



gdpr.service.ts, audit.service.ts, notifications.service.ts, users.service.ts



\## \*\*Use Cases (10)\*\*



\### \*\*UC-091: GDPR data export (JSON-LD)\*\*



User requests full data export. System packages all user data (profile, quests, evidence, messages, transactions, biometrics) into JSON-LD format. Processing via BullMQ data-export queue.



\*\*Service:\*\* gdpr.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-092: 7-day download link\*\*



Export file stored with AES-256 encryption. Signed URL with 7-day expiration generated. Link sent to user via notification.



\*\*Service:\*\* gdpr.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-093: GDPR right-to-be-forgotten\*\*



User requests account deletion. System performs cascading delete across all services. All PII removed. Audit log records the deletion event.



\*\*Service:\*\* gdpr.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-094: MFA re-verification for deletion\*\*



Account deletion requires MFA re-verification (TOTP or email code). Prevents accidental or unauthorized data destruction.



\*\*Service:\*\* gdpr.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-095: Cascading delete across services\*\*



Deletion propagates to: user profile, family links, quest records, evidence files (S3), messages, financial records, biometric data, SBT references, notification preferences.



\*\*Service:\*\* gdpr.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-096: Immutable audit log (DB trigger)\*\*



PostgreSQL trigger function \\`prevent\_audit\_modification()\\` on \\`audit\_logs\\` table. Any DELETE or UPDATE attempt returns error: "audit\_logs is immutable."



\*\*Service:\*\* audit.service.ts



\*\*Frontend:\*\* /dashboard/admin/audit



\### \*\*UC-097: Audit log SHA-256 hash chain\*\*



Each audit entry includes SHA-256 hash of the previous entry, creating a verifiable chain. Tampering with any entry breaks the chain and is detectable.



\*\*Service:\*\* audit.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-098: RBAC permission checks\*\*



Every GraphQL resolver and REST endpoint checks user role before execution. Unauthorized access attempts logged in audit trail.



\*\*Service:\*\* roles.guard.ts



\*\*Frontend:\*\* -



\### \*\*UC-099: Notification preferences\*\*



Users configure which notifications they receive: quest reminders, safety alerts, weekly reports, achievement celebrations. Per-channel: in-app, email (when configured), push.



\*\*Service:\*\* notifications.service.ts



\*\*Frontend:\*\* /dashboard/settings



\### \*\*UC-100: Privacy controls per domain\*\*



Users set privacy level per data domain: public (visible to pod members), family (visible to parents), private (self only). Default: family for under-16, private for 16+.



\*\*Service:\*\* users.service.ts



\*\*Frontend:\*\* /dashboard/settings



\# \*\*Module 12: Proactive AI Features\*\*



\## \*\*Business Case\*\*



Beyond reactive tutoring, UDB's AI layer proactively identifies skill gaps, simulates future outcomes, orchestrates multi-agent workflows, and provides contextual feedback. These features transform UDB from a tool parents use INTO a system that actively guides child development.



\## \*\*Process Flow\*\*



Proactive Loop: System continuously analyzes UUP data → Skill gap analysis identifies under-practiced areas (score <0.3 = critical) → AI generates recommendations (quests, activities, schedule changes) → Future Self simulator shows long-term impact of current choices → Parent receives weekly summary with AI insights → Agent orchestration coordinates across services to deliver interventions.



\## \*\*Actors\*\*



AI Engine (proactive), Parent (recipient), Child (beneficiary), System



\## \*\*Services\*\*



feedback.service.ts, ai.service.ts, skill-gap.service.ts, future-self.service.ts, agent.service.ts, pinecone.service.ts, offline-tutor.service.ts



\## \*\*Use Cases (6)\*\*



\### \*\*UC-101: AI contextual feedback\*\*



After quest completion or tutoring session, AI provides contextual feedback: strengths demonstrated, areas for improvement, next recommended challenge.



\*\*Service:\*\* feedback.service.ts



\*\*Frontend:\*\* /dashboard/tutor



\### \*\*UC-102: Skill gap analysis\*\*



System analyzes all activity data to identify skill gaps per subject. Gap score <0.3 flagged as critical. Drives weekly planner priorities and quest recommendations.



\*\*Service:\*\* ai.service.ts / skill-gap.service.ts



\*\*Frontend:\*\* GraphQL



\### \*\*UC-103: Future Self simulator\*\*



Monte Carlo simulation projects long-term outcomes based on current habits. Shows child: "If you keep this up, in 6 months you'll be at Level 25 with 3 SBTs." Motivational tool.



\*\*Service:\*\* future-self.service.ts



\*\*Frontend:\*\* /dashboard/future-self



\### \*\*UC-104: Agent orchestration\*\*



Coordinates multiple AI services to deliver complex interventions. E.g., skill gap detection → triggers quest creation → adjusts weekly plan → sends notification. All in one workflow.



\*\*Service:\*\* agent.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-105: Pinecone vector embeddings\*\*



Stores curriculum content as vector embeddings for semantic search. AI tutor retrieves relevant context when answering questions. Foundation for RAG pipeline.



\*\*Service:\*\* pinecone.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-106: Offline tutor (Mistral-7B)\*\*



Client-side AI tutor using Mistral-7B GGUF model for offline use. Syncs sessions when connection restored. Deferred: requires Electron or React Native client.



\*\*Service:\*\* offline-tutor.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 13: Institutional \& Ecosystem\*\*



\## \*\*Business Case\*\*



UDB scales from individual families to schools and institutions. Clever/ClassLink OAuth enables single sign-on for school districts. Anonymized cohort metrics let teachers see class-level trends without individual student data. LMS sync imports assignments from Google Classroom and Canvas. The Quest Store enables content creators to publish curriculum-aligned quests.



\## \*\*Process Flow\*\*



Institutional Onboarding: School signs DPA (Data Processing Agreement) → Clever/ClassLink OAuth configured for the district → Teachers log in via SSO → Student accounts auto-provisioned from roster → Anonymized cohort dashboard available to teachers → LMS assignments sync into student quest boards → Content creators publish quests to Quest Store → Teachers assign store quests to classes.



\## \*\*Actors\*\*



Teacher, District Admin, Content Creator, Student, System



\## \*\*Services\*\*



institutional.service.ts, uup-sync.service.ts, lms-sync, quest-store.service.ts



\## \*\*Use Cases (6)\*\*



\### \*\*UC-107: Clever/ClassLink OAuth\*\*



SSO integration for school districts via Clever or ClassLink. Automatic student provisioning from roster data. DEFERRED: requires partnership DPA.



\*\*Service:\*\* institutional.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-108: Anonymized cohort metrics\*\*



Teachers see class-level trends (average Safety Score, common skill gaps, completion rates) without individual student names or PII. DEFERRED: requires institutional flag.



\*\*Service:\*\* institutional.service.ts



\*\*Frontend:\*\* /dashboard/admin/tenants



\### \*\*UC-109: UUP sync (external platforms)\*\*



Synchronizes Unified User Profile data with external platforms. Push/pull API for third-party integrations. Webhooks for real-time sync.



\*\*Service:\*\* uup-sync.service.ts



\*\*Frontend:\*\* /dashboard/sync



\### \*\*UC-110: LMS sync\*\*



Imports assignments, due dates, and grades from Google Classroom and Canvas LMS. Converts assignments into UDB quests for gamified completion tracking.



\*\*Service:\*\* lms-sync



\*\*Frontend:\*\* /dashboard/sync



\### \*\*UC-111: Quest store / content marketplace\*\*



Marketplace where content creators publish curriculum-aligned quests. Revenue sharing model. DEFERRED: requires vendor onboarding workflow.



\*\*Service:\*\* quest-store.service.ts



\*\*Frontend:\*\* -



\### \*\*UC-112: Content creator review workflow\*\*



Submitted quests go through quality review before publication. AI checks for age-appropriateness, curriculum alignment, and content quality. DEFERRED.



\*\*Service:\*\* quest-store.service.ts



\*\*Frontend:\*\* -



\# \*\*Module 14: Infrastructure \& DevOps\*\*



\## \*\*Business Case\*\*



Enterprise-grade infrastructure ensures reliability, security, and scalability. The 18-container Docker stack includes dedicated observability (Prometheus, Grafana, Jaeger, Loki, AlertManager, OTel), automated encrypted backups, connection pooling, and CI/CD with branch protection. This infrastructure is what differentiates UDB from prototype-stage EdTech competitors.



\## \*\*Process Flow\*\*



Operational Loop: Code pushed to GitHub → CI runs 4 jobs (typecheck, lint, test, docker-build) → Branch protection requires all green → Docker images built and deployed → Prometheus scrapes 7 targets every 15s → Grafana dashboards show real-time metrics → AlertManager fires on thresholds (>80% CPU, >1% error rate, service down) → Loki aggregates logs for debugging → Jaeger traces requests across services → db-backup runs every 6 hours with AES-256 encryption.



\## \*\*Actors\*\*



DevOps, CI/CD Pipeline, Monitoring Stack, System



\## \*\*Services\*\*



Docker Compose, GitHub Actions, Prometheus, Grafana, Jaeger, Loki, AlertManager, OTel, db-backup



\## \*\*Use Cases (8)\*\*



\### \*\*UC-113: 18 Docker containers healthy\*\*



All containers pass health checks: API (curl /health), Frontend (wget /), Redis (redis-cli ping), PostgreSQL (pg\_isready), all microservices (curl /\\\*/health).



\*\*Service:\*\* Docker Compose



\*\*Frontend:\*\* -



\### \*\*UC-114: PostgreSQL 16 + TimescaleDB\*\*



38 tables across 3 Prisma migrations. TimescaleDB 2.17.2 extension with biometric\_logs hypertable (1-month chunks). Connection pooling via PgBouncer.



\*\*Service:\*\* PostgreSQL + PgBouncer



\*\*Frontend:\*\* -



\### \*\*UC-115: Redis 7 operational\*\*



Cache (query results), queues (BullMQ: ai-hints, analytics, notifications, cleanup), rate limiting (sliding window), credential store (argon2id hashes), feature flags.



\*\*Service:\*\* Redis 7



\*\*Frontend:\*\* -



\### \*\*UC-116: Prometheus + Grafana metrics\*\*



Prometheus scrapes 7 targets. 10 alert rules configured. 2 Grafana dashboards provisioned (Overview + Runtime). 2 datasources (Prometheus + Loki).



\*\*Service:\*\* Prometheus + Grafana



\*\*Frontend:\*\* -



\### \*\*UC-117: Jaeger distributed tracing\*\*



OTLP-enabled tracing across all services. Jaeger All-in-One at port 16686. Traces show request flow from Nginx → Gateway → API → Database.



\*\*Service:\*\* Jaeger



\*\*Frontend:\*\* -



\### \*\*UC-118: Loki log aggregation\*\*



Centralized log collection from all containers via Promtail. Queryable through Grafana Explore. Local filesystem storage (S3 backend planned for production).



\*\*Service:\*\* Loki + Promtail



\*\*Frontend:\*\* -



\### \*\*UC-119: AlertManager alert routing\*\*



10 alert rules route to 2 receivers: default-webhook (all alerts) and critical-webhook (severity=critical, 1h repeat). Webhooks target udb-api:4000/webhooks/alerts.



\*\*Service:\*\* AlertManager



\*\*Frontend:\*\* -



\### \*\*UC-120: OTel Collector\*\*



OpenTelemetry Collector receives traces, metrics, and logs via OTLP protocol (port 4318). Forwards to Jaeger (traces), Prometheus (metrics), and Loki (logs).



\*\*Service:\*\* OTel Collector



\*\*Frontend:\*\* -



\# \*\*Appendix: Feature Flag Reference\*\*



| \*\*Flag\*\*           | \*\*State\*\* | \*\*Module\*\*         | \*\*Blocker\*\*                           |

| ------------------ | --------- | ------------------ | ------------------------------------- |

| safety-score       | ON        | Safety \& Agency    | None                                  |

| data-export        | ON        | Data \& Compliance  | None                                  |

| messaging          | ON        | Social \& Messaging | None                                  |

| skill-gap-analysis | ON        | Proactive AI       | None                                  |

| ai-feedback        | ON        | Proactive AI       | None                                  |

| streak-freeze-auto | ON        | Gamification       | None                                  |

| co-op-quests       | ON        | Gamification       | None                                  |

| joon-world         | ON        | Social \& Messaging | None                                  |

| offline-tutor      | OFF       | Proactive AI       | Requires Electron/React Native client |

| biometric-feed     | OFF       | Safety \& Agency    | Requires HealthKit/Google Fit SDK     |

| electron-agent     | OFF       | Safety \& Agency    | Requires Electron desktop app         |

| institutional      | OFF       | Institutional      | Requires Clever/ClassLink DPA         |

| quest-store        | OFF       | Institutional      | Requires vendor onboarding workflow   |

