# UDB v19.0 — Client Demo Script

**Duration:** 20–30 minutes  
**Demo accounts:** Pre-seeded with realistic data (family of 4: Sarah, Leo, Maya Johnson + Alex Admin)  
**Environment:** Production stack running via Docker Compose on `https://localhost`

---

## Setup (verify before presenting)

```bash
# 1. Verify all services are healthy
curl -sk https://localhost/health
# Expected: {"status":"ok","service":"udb-api","version":"1.0.0","checks":{"database":{"status":"up"},"redis":{"status":"up"}}}

# 2. Verify Grafana is up
curl -sk http://localhost:3005/api/health
# Expected: {"database":"ok","version":"13.0.1"}

# 3. Verify Prometheus is up
curl -sk http://localhost:9090/-/ready
# Expected: Prometheus Server is Ready.

# 4. (If browser cannot resolve "api" hostname) Add to hosts file:
#    127.0.0.1 api
```

---

## Demo Flow

### 1. Landing Page (2 min)

Open `https://localhost/` in browser.

Walk through:
- **Hero section** — "One Platform. Every Pillar of Growth."
- **4 Pillars** — Academic, Biometric, Gamification, Entrepreneurship
- **Secret Sauce Features** — AI Tutor, UUP Sync, Weekly Planning, Future Self Simulator, Safety Guardian, Financial Escrow
- **CTA buttons** — "Start Your Journey" and "View Demo"

### 2. Authentication & User Roles (3 min)

**Login via Browser** (login page renders at `https://localhost/auth/login`):

1. Open `https://localhost/auth/login` in the browser
2. Enter `sarah.demo@udb.app` / `DemoParent123!` and click Sign In
3. Verify redirect to dashboard after successful login
4. Log out, then try other demo accounts:
   - Leo: `leo.demo@udb.app` / `DemoKid123!` (CHILD)
   - Maya: `maya.demo@udb.app` / `DemoTeen123!` (CHILD)
   - Alex: `admin.demo@udb.app` / `DemoAdmin123!` (ADMIN)

> **Note:** Self-signed TLS warning expected — click "Advanced" → "Proceed to localhost".

**Key Points:**
- Returns JWT token, refresh token, userId, displayName, role
- Mass assignment protection — API register always creates `CHILD` role
- Roles updated via Prisma: Sarah→PARENT, Alex→ADMIN, Leo/Maya→CHILD
- Auth backed by auth-service → Redis password hash (not Firebase)

### 3. Dashboard Tour (5 min)

Navigate dashboard routes. All return HTTP 200.

| Route | Description |
|-------|-------------|
| `/dashboard` | Main dashboard — activity feed, stats |
| `/dashboard/doter` | Gamified avatar (Leo: Sparky JUVENILE, Maya: Blossom HATCHLING) |
| `/dashboard/quests` | Active quests with XP/coin rewards |
| `/dashboard/goals` | Academic, health, life skills goals |
| `/dashboard/academic` | Academic performance & LMS sync |
| `/dashboard/biometric` | Sleep, HRV, focus scores (8 days of data seeded) |
| `/dashboard/analytics` | Platform analytics |
| `/dashboard/calendar` | Activity calendar with deep work sessions |
| `/dashboard/tutor` | AI Socratic Tutor |
| `/dashboard/ventures` | Kid-Preneur hub (Lemonade Stand) |
| `/dashboard/evidence` | Evidence gallery |
| `/dashboard/achievements` | Badges & rewards |
| `/dashboard/family` | Family management |
| `/dashboard/safety` | Safety monitoring (scores 92-95) |
| `/dashboard/settings` | User settings |
| `/dashboard/admin` | Admin console (Alex only) |
| `/dashboard/bank` | Points ledger & transactions |
| `/dashboard/messages` | Family messaging |
| `/dashboard/notifications` | System notifications |
| `/dashboard/onboarding` | Onboarding wizard |
| `/dashboard/weekly-plan` | AI-generated weekly plans |
| `/dashboard/sync` | UUP sync status |
| `/dashboard/billing` | Subscription management |
| `/dashboard/future-self` | Future Self Simulator |
| `/dashboard/joon-world` | Joon World integration |
| `/dashboard/marketplace` | Skills marketplace |
| `/dashboard/evidence` | Evidence gallery |

### 4. Seeded Demo Data Walkthrough (5 min)

**Family Structure:**
- Sarah Johnson (Parent) — 2 children: Leo & Maya
- Leo Johnson (Child, age 12) — Doter: Sparky 🐣 Level 8, 1,250 coins
- Maya Johnson (Child, age 14) — Doter: Blossom 🌱 Level 5, 800 coins
- Alex Admin (Administrator)

**Leo's Quests:**
- "Complete 10 Fraction Worksheets" (ACADEMIC, IN_PROGRESS)
- "Sleep 8+ Hours for 5 Days" (BIOMETRIC, IN_PROGRESS)
- "Read 1 Chapter of Your Book" (ACADEMIC, PENDING)
- "Make Your Bed for a Week" (LIFE_SKILLS, APPROVED)
- "Lemonade Stand Business Plan" (ENTREPRENEURSHIP, SUBMITTED)

**Maya's Quests:**
- "Draw a Nature Scene" (SOCIAL, IN_PROGRESS)
- "Read Charlotte's Web Chapter 1-3" (ACADEMIC, PENDING)
- "Practice Spelling Words" (ACADEMIC, APPROVED)

**Transaction History:**
- Leo: 6 transactions — quest rewards, streak bonus, Doter skin purchase
- Maya: 5 transactions — quest rewards, streak bonus, accessory purchase

**Skill Gaps Detected:**
- Leo: Fractions (22%), Algebra (45%), Reading Comp (80%), Social Skills (18%)
- Maya: Geometry (55%), Vocabulary (30%), Creative Writing (40%)

**Streaks:**
- Leo: Academic 12-day streak, Biometric 5-day, Life Skills 3-day
- Maya: Academic 5-day, Social 2-day

### 5. Monitoring Stack (2 min)

**Prometheus:** `http://localhost:9090`
- Pre-built alert rules (8 rules) in `infra/prometheus/alert-rules.yml`
- Metrics: auth failures, signups, quests, Redis ops, DB pool

**Grafana:** `http://localhost:3005` (admin/admin)
- Dashboard: "UDB Runtime Overview" at `http://localhost:3005/d/udb-overview`
- Panels: Service health, request rate, error rate, auth/signups, memory, quests
- Data sources: Prometheus + Loki (configured)

### 6. Architecture Overview (3 min)

```
Browser → https://localhost:443 (Nginx)
  ├── /auth/*        → Gateway:3000 → auth-service:3001 → Redis/PostgreSQL
  ├── /graphql       → API:4000
  ├── /health        → API:4000
  └── / (everything) → Frontend:3030 (Next.js)
```

**Key Services:**
| Service | Port | Stack |
|---------|------|-------|
| Nginx | 443/80 | Reverse proxy, TLS termination |
| Frontend | 3030 | Next.js (React Server Components) |
| Gateway | 3000 | Express — auth, rate-limit, circuit breaker |
| Auth Service | 3001 | Express — register, login, JWT |
| API | 4000 | NestJS — GraphQL, REST, Prisma |
| PostgreSQL | 5432 | TimescaleDB (via PgBouncer on 6432) |
| Redis | 6379 | Auth sessions, rate limits, queues |
| Prometheus | 9090 | Metrics collection & alerting |
| Grafana | 3005 | Dashboard visualization |
| Loki | 3100 | Log aggregation |

### 7. End-to-End Journey Demo (5 min)

**Journey 1: Child Login + Quest Completion**
1. Login as Leo → Get JWT
2. View `/dashboard/quests` — see pending fractions worksheet
3. Check `/dashboard/doter` — Sparky JUVENILE with 7,200 XP
4. View `/dashboard/analytics` — skill gaps & progress

**Journey 2: Parent Dashboard**
1. Login as Sarah → Get JWT
2. View `/dashboard/family` — family management
3. View `/dashboard/safety` — safety scores 92 (Leo), 95 (Maya)
4. Check `/dashboard/notifications` — skill gap alerts

**Journey 3: Admin Console**
1. Login as Alex → Get JWT
2. View `/dashboard/admin` — platform overview
3. View `/dashboard/analytics` — system metrics

**Journey 4: Financial Escrow**
1. Leo's venture — "Lemonade Stand" under `/dashboard/ventures`
2. Business plan with AI-generated fields
3. Revenue tracking ($45 earned)

**Journey 5: AI Tutor**
1. Navigate to `/dashboard/tutor`
2. Socratic questioning approach (no direct answers)
3. Topic mastery tracking across subjects

### 8. Closing (1 min)

**Demo Data Summary:**
- 4 users (1 Parent, 2 Children, 1 Admin)
- 2 Doter profiles (Sparky, Blossom)
- 8 quests (various statuses)
- 11 financial transactions
- 7 skill gaps identified
- 5 streak records
- 4 achievements/badges
- 8 days biometric data each
- Family links established
- Onboarding completed

**Next Steps for Production:**
- Configure proper TLS certificates (currently self-signed)
- Set up email service for password reset / welcome emails
- Configure Stripe webhooks for escrow payments
- Deploy to cloud with proper domain and SSL

---

## Quick Reference

### Demo Accounts

| Name | Email | Password | Role |
|------|-------|----------|------|
| Sarah Johnson | sarah.demo@udb.app | DemoParent123! | PARENT |
| Leo Johnson | leo.demo@udb.app | DemoKid123! | CHILD |
| Maya Johnson | maya.demo@udb.app | DemoTeen123! | CHILD |
| Alex Admin | admin.demo@udb.app | DemoAdmin123! | ADMIN |

### User IDs

| User | ID |
|------|----|
| Sarah | `c84ffa1f-6dcd-40db-bd38-7909127ef248` |
| Leo | `3d9a63fb-e3e0-4935-9980-4d73deb63206` |
| Maya | `660e1c21-ae02-4413-b8e1-8fc232a96510` |
| Alex | `81dc1369-e638-4dc7-9532-41d9eb7e5bb8` |

### Service Endpoints

| Service | URL |
|---------|-----|
| Frontend | `https://localhost/` |
| API Health | `https://localhost/health` |
| Auth Login | `POST https://localhost/auth/login` |
| Auth Register | `POST https://localhost/auth/register` |
| GraphQL | `POST https://localhost/graphql` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3005` (admin/admin) |

### Key Files

| File | Purpose |
|------|---------|
| `docs/DEMO_SCRIPT.md` | This document |
| `services/api/prisma/seed-demo.ts` | Demo data seeder (run with `npx ts-node prisma/seed-demo.ts`) |
| `infra/nginx/nginx.conf.template` | Nginx reverse proxy config |
| `infra/prometheus/alert-rules.yml` | 8 Prometheus alert rules |
| `infra/grafana/dashboards/udb-overview.json` | Grafana overview dashboard |
| `infra/grafana/dashboards/udb-runtime.json` | Grafana runtime details |
| `docs/FINAL_TEST_REPORT.md` | v18.0 test closure report |
