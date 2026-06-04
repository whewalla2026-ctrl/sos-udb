# UDB Platform — End User Training Guide

**Version:** v15.0 | **Date:** 2026-05-31

## Table of Contents
1. Welcome to UDB
2. Getting Started
3. For Parents
4. For Children & Teens
5. For Administrators
6. For Teachers
7. Common Workflows
8. Troubleshooting
9. Quick Reference

---

## 1. Welcome to UDB

### What is UDB?
The Unified Developmental Backbone (UDB) is a family-centered platform that helps children ages 6-23 develop healthy habits, academic skills, and life readiness through:
- **AI-Powered Learning** — A Socratic tutor that guides without giving answers
- **Gamification** — A virtual companion (Doter) that reflects real-world health and habits
- **Weekly Planning** — AI-generated schedules tailored to each child's needs
- **Financial Literacy** — A safe escrow marketplace for student ventures
- **Achievement Credentials** — Blockchain-verified Soulbound Tokens (SBTs) for completed goals

### Who Uses UDB?
- **Parents** — Manage family accounts, approve activities, monitor progress
- **Children (6-12)** — Complete quests, care for Doter, learn with AI tutor
- **Teens (13-17)** — Everything children can do plus messaging, ventures, and more autonomy
- **Young Adults (18-23)** — Full platform access including financial tools
- **Administrators** — Manage users, feature flags, audit logs, billing
- **Teachers** — View anonymized cohort metrics (institutional feature)

---

## 2. Getting Started

### Creating Your Account

1. Navigate to the UDB registration page (`/auth/register`).
2. Enter your email address and create a strong password (at least 12 characters, including uppercase, lowercase, a digit, and a special character).
3. Select your role: Parent, Teen (13+), or Young Adult (18+).
4. Complete your profile — timezone, preferred language, accessibility preferences.
5. If you are a Parent, you will be guided through adding your children.

### Adding a Child Account (Parents Only)

1. Go to Dashboard → Family (`/dashboard/family`).
2. Click **Add Child**.
3. Enter the child's name, age, and grade.
4. If the child is under 13, you must complete COPPA Verified Parental Consent:
   - **Option A:** Credit card micro-charge ($0.50, refunded within 48 hours)
   - **Option B:** Government ID verification
5. Once verified, the child receives login credentials.

**Important:** Children under 13 cannot create accounts on their own. A parent must initiate the process.

---

## 3. For Parents

### Dashboard Overview
Your dashboard shows:
- **Family Overview** — All children's status at a glance
- **Weekly Plan** — This week's schedule for each child
- **Notifications** — Pending approvals, quest completions, safety alerts
- **Safety Score** — Composite wellness indicator for each child

### Reviewing Weekly Plans

1. Go to Dashboard → Weekly Plan (`/dashboard/weekly-plan`).
2. Review the AI-generated schedule for each child. The AI considers:
   - Your child's chronotype (morning/afternoon learner)
   - Academic workload
   - Screen time limits (max 3 hours/day for under 12)
   - Physical activity requirements
3. Modify any time slots if needed. Parent-locked slots cannot be AI-rescheduled.
4. Click **Approve Plan** to activate the schedule.

**Note:** Plans remain in draft until you approve them. Your child cannot see unapproved plans.

### Approving Quests and Evidence

When your child completes a quest, they submit photo or video evidence. The AI vision system scores it automatically:
- **Score >= 85%** — Auto-approved. Points awarded immediately.
- **Score 60-84%** — Sent to your approval queue. Review in Dashboard → Notifications.
- **Score < 60%** — Rejected with constructive feedback. Child can retry after 1 hour.

To review pending evidence:
1. Go to Dashboard → Notifications (`/dashboard/notifications`).
2. View the photo/video submission.
3. Click **Approve** or **Request Redo** with a note.

### Managing Escrow Transactions

If your child sells a service or product through the marketplace:
1. The buyer's payment is held in escrow (not transferred yet).
2. Your child submits proof of delivery.
3. Review the proof in Dashboard → Bank → Pending Releases (`/dashboard/bank`).
4. Click **Release Funds** (requires re-authentication for security).

**Transaction limits:** Under 16: $200 max per transaction. Ages 16-18: $500 max.

### Monitoring Safety

The Safety Score (0-100) reflects your child's overall wellness:
- **Routine completion** (25%) — Are they following their plan?
- **Sleep regularity** (20%) — Consistent bedtime?
- **Social engagement** (15%) — Interacting with peers?
- **Biometric stability** (10%) — (When biometric feed is enabled)
- **Focus consistency** (30%) — (When desktop agent is enabled)

If the score drops below 40, you receive an automatic notification.

### Privacy Controls

- **Data Export:** Dashboard → Settings → Privacy → **Export My Data**. Generates a JSON-LD file with 7-day download link.
- **Data Deletion:** Dashboard → Settings → Privacy → **Delete My Data**. Requires MFA re-verification. Cascading delete across all services.
- **Notification Preferences:** Opt out of specific AI alerts per domain (academic, physical, social, etc.).

---

## 4. For Children & Teens

### Your Doter Companion

The Doter is your virtual companion that reflects how you're doing in real life:
- **Energetic** — You're sleeping well, staying active, and on a streak!
- **Neutral** — Default state. Keep going!
- **Sluggish** — You might need more sleep or less stress. The Doter suggests wellness activities.
- **Evolving** — You leveled up! Watch the evolution animation.
- **Resting** — Streak freeze is active. Take a break, no pressure.

### Completing Quests

1. Go to Dashboard → Quests (`/dashboard/quests`) to see your available quests.
2. Choose a quest and read the instructions.
3. Complete the activity in real life (e.g., clean your room, practice math, exercise).
4. Take a photo or short video as evidence.
5. Upload the evidence through the quest page.
6. The AI reviews your submission:
   - High score → Points awarded automatically!
   - Medium score → Sent to parent for review.
   - Low score → You'll get helpful feedback and can try again in 1 hour.

### Using the AI Tutor

1. Go to Dashboard → Tutor (`/dashboard/tutor`).
2. Ask a question about any subject.
3. The tutor will guide you with questions (it never gives direct answers).

**Important:** The tutor is designed to help you THINK, not to do your homework. If you ask for a direct answer, it will gently redirect you.

**If you get frustrated:** The tutor notices and will offer encouragement. After 3 rounds without progress, it suggests asking a human mentor for help.

### Points and Achievements

- **Earning points:** Complete quests, maintain streaks, help family members.
- **Spending points:** Buy streak freezes, marketplace items, or special Doter accessories.
- **Streak Freezes:** If you're feeling unwell, use a streak freeze to pause your streak for 24 hours without losing progress. You can also purchase these with points.

### Joon World (Social)

Study pods are virtual rooms where up to 4 friends can collaborate on quests together.
- Text chat available for all ages.
- Voice chat available for ages 13+.
- Your earned SBT achievements are displayed in a 3D gallery.
- Under 13: Parent must approve pod joins.

---

## 5. For Administrators

### Admin Dashboard

Access: Dashboard → Admin (`/dashboard/admin`) — requires Admin role.

**Available sections:**
- **Users** — View, search, and manage all user accounts
- **Audit Log** — Immutable record of every system action (read-only)
- **Billing** — Subscription management and invoice history
- **Features** — Feature flag management (enable/disable features)
- **Health** — System health dashboard with container status
- **Tenants** — Multi-tenant management (institutional accounts)

### Feature Flag Management

Go to Dashboard → Admin → Features (`/dashboard/admin/features`).

Each flag shows its current state (ON/OFF) and what it controls. Toggle flags to enable or disable features without redeploying code.

**Currently ON:** safety-score, data-export, messaging, skill-gap-analysis

**Currently OFF:** offline-tutor, biometric-feed, electron-agent, joon-world, co-op-quests, institutional, quest-store, ai-feedback, streak-freeze-auto

### Audit Log Review

Go to Dashboard → Admin → Audit (`/dashboard/admin/audit`).

Every mutation in the system creates an immutable audit record with:
- Who did it (actor ID)
- What they did (action)
- When (timestamp)
- SHA-256 hash for tamper detection

The audit log cannot be modified or deleted — this is enforced at the database level by a PostgreSQL trigger.

---

## 6. For Teachers

**Note:** The institutional feature is currently behind a feature flag (OFF). When enabled:
- Log in via Clever or ClassLink OAuth.
- View anonymized cohort metrics only — no individual student data.
- Assign curriculum-aligned quests to students (requires parent approval per child).
- A signed Data Processing Agreement (DPA) is required before any data access.

---

## 7. Common Workflows

### Workflow: Weekly Planning Cycle
1. Sunday evening: AI generates draft plan based on child's data
2. Parent reviews and approves plan
3. Child follows schedule throughout the week
4. AI adjusts next week based on completion patterns

### Workflow: Quest → Evidence → Points → SBT
1. Child selects and completes a quest
2. Uploads photo/video evidence
3. AI scores the submission
4. Points awarded (auto or after parent approval)
5. When a goal reaches 100%, parent approves SBT minting
6. Blockchain credential is permanently recorded

### Workflow: Escrow Transaction
1. Student lists service/product on marketplace
2. Buyer purchases → funds held in escrow
3. Student delivers and uploads proof
4. Parent reviews proof → releases funds
5. Money transfers to student's connected account

---

## 8. Troubleshooting

### "I can't log in"
- Check your email and password are correct.
- If you forgot your password, use **Forgot Password** on the login page.
- If your account is locked due to too many attempts, wait 15 minutes.

### "My child's account won't activate"
- COPPA verification must be completed for children under 13.
- Check your email for the verification link.
- The micro-charge may take up to 48 hours to appear and refund.

### "The AI tutor won't answer my question"
- The tutor is designed to guide, not answer directly. Try rephrasing your question.
- If you're working on a graded assignment, the tutor will not help solve it (by design).
- After 3 unsuccessful attempts, click **Ask a Mentor** for human help.

### "My weekly plan wasn't generated"
- Plans are generated Sunday evening in your timezone.
- Check Dashboard → Weekly Plan → select the current week.
- If no plan appears, ensure your profile timezone is set correctly.

### "Evidence upload failed"
- Maximum file size: 10 MB.
- Supported formats: JPG, PNG, MP4.
- Check your internet connection and try again.

### "Points weren't awarded"
- If the vision score was 60-84%, the submission is in your parent's approval queue.
- If the score was below 60%, you need to resubmit after 1 hour.
- Check Dashboard → Quests → History for submission status.

---

## 9. Quick Reference

### Key URLs
| Page | URL |
|------|-----|
| Login | `/auth/login` |
| Register | `/auth/register` |
| Dashboard | `/dashboard` |
| Quests | `/dashboard/quests` |
| Tutor | `/dashboard/tutor` |
| Weekly Plan | `/dashboard/weekly-plan` |
| Family | `/dashboard/family` |
| Bank | `/dashboard/bank` |
| Settings | `/dashboard/settings` |
| Admin | `/dashboard/admin` |
| Safety | `/dashboard/safety` |
| Messages | `/dashboard/messages` |
| Evidence | `/dashboard/evidence` |
| Achievements | `/dashboard/achievements` |

### Roles & Permissions Summary
| Action | Child 6-12 | Teen 13-17 | Young Adult 18+ | Parent | Admin |
|--------|-----------|-----------|----------------|--------|-------|
| View own profile | Limited | Full | Full | Full | Full |
| Complete quests | ✅ | ✅ | ✅ | — | — |
| Use AI tutor | ✅ | ✅ | ✅ | — | — |
| Send messages | Filtered | ✅ | ✅ | ✅ | ✅ |
| Marketplace escrow | — | $200 max | $500 max | Approve | Full |
| View audit log | — | — | — | Own child | Full |
| Manage features | — | — | — | — | ✅ |
| Export data | — | — | ✅ | ✅ | ✅ |
| Joon World pods | Parent-join | ✅ | ✅ | — | — |

### Support
- In-app: Dashboard → Settings → Help
- System health: Grafana (port 3005), Prometheus (port 9090)
- Runbook: `docs/RUNBOOK.md`
