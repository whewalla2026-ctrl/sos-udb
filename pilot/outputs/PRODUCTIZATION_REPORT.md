# UDB Platform — Productization Report

**Prepared:** May 9, 2026
**Codebase:** `apps/web/` (Next.js 14 + Apollo Client), `services/api/` (NestJS + Prisma + PostgreSQL)
**Status:** Pre-MVP — functional prototypes with mocked auth, no billing, no onboarding backend

---

## 1. PRODUCT UX AUDIT

### 1.1 Landing Page (`apps/web/src/app/page.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | Hero section with gradient brand text, 4 stats, 4 pillars grid, 6 feature cards, CTA section. Sticky header with nav links, Sign In / Get Started buttons. Animated background grid with glassmorphism cards. |
| **Strengths** | Visually polished — glassmorphism design system, gradient text, hover animations, coherent dark theme. Mobile-responsive layout via CSS. Good typography (Space Grotesk + Inter). |
| **UX gaps** | All icons are emoji (🌟, ✨, 🚀, 🎓, 💓, 🐣, 💼, 🧠, ⚡, 🗓️, 🔮, 🛡️, 💰). These render differently across OS and look unprofessional. No A/B testing hooks. No analytics tracking. No cookie consent banner. CTA buttons do not pre-fill registration form. Stats are static (not fetched from real data). |
| **Action items** | Replace emoji with `lucide-react` SVGs (already in `package.json`). Add analytics (PostHog/Plausible). Add GDPR/cookie consent banner. Make stats dynamic from backend. Add `next/font` optimization. Add meta OG images. |

### 1.2 Auth — Login (`apps/web/src/app/auth/login/page.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | Email/password form, Google sign-in button, "Forgot password?" link. Visual loading spinner on submit. |
| **UX gaps** | **Auth is fully mocked with `setTimeout`** — no Firebase SDK integration. Google button just redirects to `/dashboard`. No error states (wrong password, account not found, network error). No rate limiting. No password visibility toggle. No form validation beyond HTML `required`. Forgot password flow exists as a route directory but was not examined — likely also mocked. No session persistence (no token refresh). |
| **Action items** | Integrate Firebase Auth SDK on client. Add `signInWithEmailAndPassword` and `signInWithPopup` (Google). Implement error boundaries for each auth failure mode. Add form validation with `react-hook-form` + `zod`. Add password reset flow. Add session persistence with token refresh. Remove all `setTimeout` mocks. |

### 1.3 Auth — Register (`apps/web/src/app/auth/register/page.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | 3-step wizard: Account (role selection, name, email, password) → Family (child name, DOB, COPPA consent method) → Setup (Doter egg intro, summary). Step progress bar. |
| **UX gaps** | **Fully mocked with `setTimeout`** — no actual account creation. COPPA consent selection UI exists but no backend verifies it. Password field has placeholder text encouraging strong passwords but no real strength meter. No email verification step. No terms/PP checkboxes. No real Doter naming step (the Setup step just shows an egg with a summary). Role selection does not adjust downstream flow (PARENT vs CHILD both get same steps). |
| **Action items** | Wire to real `createUser` mutation. Add email verification. Add password strength meter. Add COPPA consent backend integration (credit card hold or ID upload). Add TOS/Privacy Policy checkboxes. Create proper onboarding flow (see Section 3). Add error states for duplicate email, weak password, etc. |

### 1.4 Dashboard — Main (`apps/web/src/app/dashboard/page.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | Fetches `GET_ME` and `GET_DASHBOARD_DATA`. Routes to `ChildDashboard` or `ParentDashboard` based on `user.role`. Loading skeleton with shimmer placeholders. |
| **UX gaps** | Dashboard data query uses `@client`-like fields (`dashboardData`, `myDoter`, `myGoals`, etc.) that appear to return JSON directly — many are likely unresolved or return empty arrays. The `childData` object hardcodes fallback biometric values (sleep 8h, focus 80, etc.) instead of showing loading/error. No error boundary if GraphQL query fails — the page would crash. No fallback for missing role (defaults to CHILD). |
| **Action items** | Add error boundary with retry button. Replace hardcoded fallbacks with proper loading/error/success states. Add proper GraphQL return types. Add `Suspense` boundaries. |

### 1.5 ChildDashboard (`apps/web/src/components/ChildDashboard.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | Doter card (orb, level, XP bar, streak badge, coin badge). 4 stat cards (sleep, focus, stress, steps). Active quests list with XP/coin rewards and progress bars. Goal progress cards with skill gap alert. Recent notifications. Quick actions grid (6 items). |
| **UX gaps** | All icons are emoji (👋, 🔥, 🪙, 🐣, 😴, 🧠, 💆, 👟, ⚔️, 🎯, 🔔, etc.). No empty state for quests (hardcodes `d.quests.map` with no fallback). No empty state for goals. Notification timestamps show raw `createdAt` strings without relative formatting (though a `timeAgo` helper exists in the notifications page but not here). Skill gap alert is hardcoded to "Fractions (22%)" — not data-driven. Quick actions use inline `onMouseEnter`/`onMouseLeave` instead of CSS `:hover`. |
| **Action items** | Replace all emoji with `lucide-react` icons. Add empty state for quests and goals. Add relative time formatting for notifications. Make skill gap alert dynamic from backend data. Move hover effects to CSS. Add aria labels on interactive elements. |

### 1.6 ParentDashboard (`apps/web/src/components/ParentDashboard.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | Welcome header, children snapshot cards (avatar, name, doter level, sleep, points), pending approvals list with approve/reject buttons, command actions sidebar (4 actions), compliance/audit card. |
| **UX gaps** | Emoji icons throughout (🛡️, 👨‍👩‍👧‍👦, 🪙, 🔍, ⚡, 🗓️, ⚔️, 💰, 🛡️, 🔐). Approve/reject buttons have no mutation wired — they likely do nothing. No confirmation dialog for reject. No way to add a child from this page (only from Family Hub). Compliance card is informative but links to `/dashboard/family/audit` which may not exist. No notification count displayed (unlike child view). |
| **Action items** | Wire approve/reject to real mutations. Add confirmation modal for reject actions. Add "Add Child" shortcut. Add notification badge. Verify audit log page exists. Replace emoji icons. |

### 1.7 Sidebar (`apps/web/src/components/Sidebar.tsx`)

| Aspect | Assessment |
|--------|-----------|
| **Current state** | 7 sections (OVERVIEW, GROWTH, LEARNING, HEALTH, MONEY, FAMILY, FUTURE) with 22 nav items. User mini-card with avatar, name, doter level/coins. Settings and Sign Out at bottom. Active state highlighting. Notification badge on Notifications. |
| **UX gaps** | **All icons are emoji** (🏠, 🐣, 🔔, ⚔️, 🎯, 📅, 🗓️, 🎓, 🧠, 📸, 💓, 🏦, 💼, 👨‍👩‍👧, 💬, 🛡️, 🔮, 🏆, 🌍, 🏪, ⚙️, 🚪). Unread count is hardcoded to 3 (not data-driven). User mini-card shows "0 coins" for new users — confusing. No role-based filtering of nav items (child sees "Family Hub" and parent sees "My Doter"?). No collapse/expand for sections. No search. No keyboard navigation. No mobile hamburger menu (CSS exists but no toggle). |
| **Action items** | **Replace all emoji with `lucide-react`.** Add real unread count from `GET_UNREAD_NOTIFICATIONS`. Role-filter nav items (hide family-related for children, hide doter-related for parents). Add collapsible sections. Add sidebar search (Cmd+K palette). Implement mobile hamburger toggle. Add keyboard navigation with arrow keys. |

### 1.8 Remaining Dashboard Pages

| Page | Path | UX Assessment |
|------|------|--------------|
| Doter | `/dashboard/doter` | Shows evolution path, XP progress, active effects. Missing: naming flow (no edit name button), no mutation on evolve. Evolution emoji (🥚, 🐥, 🐣, 🦅, 🦁, 🐉) should be custom SVGs. |
| Biometric | `/dashboard/biometric` | Manual health log modal, sleep/focus bar chart. Missing: real wearable device sync UI, no data export, chart is a CSS hack not a proper library. |
| Notifications | `/dashboard/notifications` | Has proper loading, empty ("All caught up!"), and populated states. Nice touch with colored dot for alert type. Missing: pagination, mark single as read, notification preferences link. |
| Family Hub | `/dashboard/family` | Shows linked children with COPPA verified badge. "+ Link Another Child" button exists but likely not wired. Missing: proper empty state for no children, add child flow, parental consent revocation. |
| Settings | `/dashboard/settings` | Basic profile editing with save. Email input is disabled (no change allowed). Notification checkboxes exist but don't persist. Missing: password change, accessibility settings, theme toggle, delete account. |
| Quests | `/dashboard/quests` | Not examined in full — directory exists with `page.tsx`. |
| Goals | `/dashboard/goals` | Directory exists. |
| Academic | `/dashboard/academic` | Directory exists. |
| Tutor | `/dashboard/tutor` | Directory exists. |
| Evidence | `/dashboard/evidence` | Directory exists. |
| Bank | `/dashboard/bank` | Directory exists. |
| Ventures | `/dashboard/ventures` | Directory exists. |
| Marketplace | `/dashboard/marketplace` | Directory exists. |
| Messages | `/dashboard/messages` | Directory exists. |
| Safety | `/dashboard/safety` | Directory exists. |
| Future Self | `/dashboard/future-self` | Directory exists. |
| Achievements | `/dashboard/achievements` | Directory exists. |
| Joon World | `/dashboard/joon-world` | Directory exists. |
| Calendar | `/dashboard/calendar` | Directory exists. |
| Weekly Plan | `/dashboard/weekly-plan` | Directory exists. |

**General UX gaps across all pages:**
- No breadcrumb navigation system
- No consistent back button
- No page-level error boundaries
- No loading skeleton variants (all use same pattern)
- No empty state illustrations (just text + emoji)
- All pages lack proper `<title>` tags per route
- No `Next.js` metadata API usage beyond root layout
- No keyboard shortcuts or accessibility audit
- No consistent confirmation dialogs for destructive actions

---

## 2. USER JOURNEY MAP

### 2.1 Complete Journey: New Parent

```
LANDING → REGISTER → ONBOARDING → DASHBOARD → FAMILY SETUP → FEATURE USAGE
```

**Step-by-step:**

1. **Landing** (`/`) — User sees hero, pillars, features. CTA "Start Your Journey" or "View Demo".
2. **Register** (`/auth/register`) — 3-step wizard:
   - Step 0: Select role (PARENT/CHILD), enter name, email, password.
   - Step 1: Enter child name, DOB, select COPPA consent method (credit card or ID).
   - Step 2: See Doter egg, review summary, click "Launch UDB!".
3. **First Dashboard** (`/dashboard`) — Redirected after mock `setTimeout`. Sees loading skeleton, then role-based dashboard.
   - **Gap:** No guided tour. No "Welcome" modal. No tooltips explaining what a Doter is.
4. **Family Setup** — Empty family hub. Must "Link Another Child" but child account creation flow is unclear.
   - **Gap:** No way to create a child account from parent dashboard. No invitation system.
5. **Feature Usage** — Explorer can click Quick Actions but many are stubs. No weekly plan generated on first visit.

### 2.2 Role-Based Flows

#### CHILD Flow
```
Login → Dashboard (child view) → Doter check-in → Complete quest → Log evidence → Earn XP/coins → Doter evolves
```
- Child sees their Doter, XP, active quests, goals, notifications, biometric stats.
- Quick actions: AI Tutor, Plan Week, New Quest, Log Evidence, Log Health, Future Self.
- **Missing:** No quest creation (only completion). No skill gap drill-down. No cross-pillar connection explanation.

#### PARENT Flow
```
Login → Dashboard (parent view) → Review children → Approve evidence/reject → View audit log → Command actions
```
- Parent sees children snapshots, pending approvals, command actions (weekly plan, quest assignment, escrow, safety monitor).
- **Missing:** No way to create quests for specific children. No comparison view across children. No notification preferences. No spending/coin management.

#### ADMIN Flow
```
Login → ??? → No admin UI exists
```
- ADMIN role exists in `UserRole` enum (`services/api/src/shared/user-role.ts:4`).
- `RolesGuard` (`services/api/src/auth/guards/roles.guard.ts`) can restrict resolvers by role.
- **No admin frontend exists.** No admin dashboard, no user management, no subscription management, no feature flag toggles, no analytics.

### 2.3 First-Time User Experience Pain Points

| Pain Point | Impact | Solution |
|-----------|--------|----------|
| Auth is mocked | User cannot actually create an account | Integrate Firebase Auth |
| No onboarding after registration | User lands on empty dashboard with no guidance | Add guided tour (Section 3) |
| No Doter naming in register flow | Doter defaults to unnamed/sparky | Add naming step to registration |
| No sample data for new users | Dashboard shows empty states everywhere | Seed demo data for first 24h |
| No welcome email | User may forget they signed up | Add Postmark/SendGrid integration |
| No email verification | Accounts created with typos | Add email verification step |
| No password reset flow | Locked out users cannot recover | Wire forgot/reset password |

---

## 3. ONBOARDING FLOW SPEC

### 3.1 Step-by-Step Onboarding

#### Step 1: Account Creation
**Route:** `/auth/register` (step 0 of 3)
**UI:**
- Role selector: PARENT (👤 → should be lucide `Users`) / CHILD (13+) (`User`)
- Full name input
- Email input with inline validation (check availability via GraphQL)
- Password input with strength meter (weak/medium/strong/enterprise)
- "Continue →" button
**Backend:** Create user with `CHILD` or `PARENT` role in `UserMaster`. `UserRel` tracks role. No Firebase dependency at this stage — use `bcryptjs` hashed password + local JWT.

#### Step 2: Family Setup & COPPA Compliance
**Route:** `/auth/register` (step 1 of 3)
**UI:**
- COPPA compliance notice (sticky banner at top)
- Child's first name input
- Child's date of birth (date picker, calculates age)
- Consent method selector:
  - Credit card verification ($0.01 hold via Stripe, auto-released)
  - Government ID upload (file upload, stored in S3, reviewed within 24h)
- "← Back" / "Continue →" buttons
**Backend:** Store consent method on `UserMaster.consentMethod`. If credit card, create Stripe `PaymentIntent` for $0.01 and capture+refund. If ID, upload to S3 with presigned URL.

#### Step 3: Doter Naming & First Quest
**Route:** `/auth/register` (step 2 of 3)
**UI:**
- Animated Doter egg reveal (CSS animation)
- "Name your Doter" text input (max 20 chars, alphanumeric)
- "Your first quest:" auto-generated introductory quest (e.g., "Set up your profile")
- Preview of Doter evolution stages (locked/unlocked states)
- "Launch UDB!" button (loading state during account creation)
**Backend:** Create `DoterProfile` with name, state=EGG, level=1. Create first quest via `QuestsModule`. Generate initial `WeeklyPlan` via AI.

#### Step 4: Dashboard Introduction (Guided Tour)
**Route:** `/dashboard?tour=true`
**Trigger:** First login after registration
**UI:** Step-by-step tooltip overlay using `framer-motion` (already in deps):
1. "This is your Doter — it grows as you learn!"
2. "Your XP bar shows progress to next evolution."
3. "Complete quests to earn XP and coins."
4. "Track your health to boost your Doter's energy."
5. "Need help? Ask the AI Tutor anytime."
**Dismiss:** "Got it!" button on last step, or skip button on any step.
**Persistence:** `localStorage.setItem('onboarding_tour_completed', 'true')`

### 3.2 Error & Edge Cases

| Scenario | Handling |
|----------|----------|
| Duplicate email | Inline error: "An account with this email already exists. Sign in instead?" with link to `/auth/login` |
| Weak password | Block form submission, show strength meter with requirements checklist |
| COPPA consent fails | Show error with retry button. Log to audit trail. Allow switching consent method. |
| Doter name too long | Maxlength + character counter. Show error on exceed. |
| Network timeout | Retry dialog with exponential backoff. Save form state in localStorage to prevent data loss. |
| Tour dismissed early | Never show again (localStorage flag). Option in Settings to restart tour. |

---

## 4. SAAS CORE FEATURES

### 4.1 Subscription Plans & Limits

| Feature | Free | Pro ($9.99/mo) | Enterprise ($49.99/mo) |
|---------|------|----------------|----------------------|
| Children tracked | 1 | 4 | Unlimited |
| Quest creation | 5/mo | Unlimited | Unlimited + custom |
| AI Tutor sessions | 10/mo | 100/mo | Unlimited |
| Biometric data points | 30 days | 12 months | Unlimited retention |
| Evidence gallery | 100 MB | 5 GB | 50 GB |
| Family members | 2 | 6 | Unlimited |
| Weekly plans | AI-assisted | AI-generated | AI-generated + custom |
| Future Self simulations | 1/mo | 4/mo | Unlimited |
| Marketplace access | Basic | Full | Full + creator tools |
| Audit log retention | 30 days | 1 year | 7 years (WORM) |
| API rate limit | 100 req/hr | 1,000 req/hr | 10,000 req/hr |
| Support | Email (72h) | Chat (4h) | Priority + phone |

### 4.2 Feature Flag System Architecture

**Proposed design** (not yet implemented):

```
services/api/src/feature-flags/
├── feature-flags.module.ts
├── feature-flags.service.ts       # Evaluates flag state
├── feature-flags.resolver.ts      # GraphQL queries for flags
├── decorators/
│   └── feature-flag.decorator.ts  # @FeatureFlag('AI_TUTOR') guard
└── schemas/
    └── feature-flag.schema.ts     # Prisma model
```

**Flag types:**
- `boolean` — on/off globally
- `percentage` — gradual rollout (0-100%)
- `plan` — gated by subscription plan (FREE/PRO/ENTERPRISE)
- `user` — specific user IDs for beta testing

**Prisma model addition:**
```prisma
model FeatureFlag {
  id          String   @id @default(uuid())
  key         String   @unique
  type        String   // boolean | percentage | plan | user
  value       Json     // { enabled: true } | { pct: 50 } | { plans: ["PRO","ENTERPRISE"] } | { userIds: [...] }
  description String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}
```

**Frontend usage:**
```typescript
// In component:
const { data } = useQuery(GET_FEATURE_FLAG, { variables: { key: 'AI_TUTOR' } });
if (!data?.featureFlag?.enabled) return <UpgradePrompt plan="Pro" />;
```

### 4.3 Billing Model Design

**Current state:** No billing infrastructure exists. `stripe` is in `services/api/package.json` but unused.

**Proposed architecture:**

```
services/api/src/billing/
├── billing.module.ts
├── billing.service.ts            # Stripe integration
├── billing.resolver.ts           # GraphQL mutations/queries
├── webhook/
│   └── billing.webhook.ts        # Stripe webhook handler
├── plans/
│   ├── plans.config.ts           # Plan definitions (Free/Pro/Enterprise)
│   └── plan.enum.ts
└── subscription/
    ├── subscription.service.ts   # CRUD, status checks
    └── subscription.schema.ts    # Prisma model
```

**Data model:**
```prisma
model Subscription {
  id            String   @id @default(uuid())
  userId        String   @unique
  plan          String   // FREE | PRO | ENTERPRISE
  status        String   // ACTIVE | PAST_DUE | CANCELED | EXPIRED
  stripeId      String?  // Stripe subscription ID
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  canceledAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Billing flow:**
1. User signs up → Free plan automatically assigned
2. User clicks "Upgrade" → Stripe Checkout Session created → redirect to Stripe
3. Stripe webhook (`checkout.session.completed`) → update subscription in DB
4. `subscription.service.ts` checks status on every GraphQL request via guard
5. Downgrade at end of billing period, cancel immediately on request

### 4.4 Tenant Isolation Approach

**Current state:** No multi-tenant isolation. All users share `UserMaster` table with `role` field.

**Proposed design:**

- **Logical isolation** via `familyId` column on `UserMaster`:
  ```prisma
  model UserMaster {
    familyId String?  // All users in a family share this
    ...
  }
  ```
- **Row-Level Security (RLS)** in PostgreSQL:
  ```sql
  ALTER TABLE "UserMaster" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY family_isolation ON "UserMaster"
    USING (familyId = current_setting('app.current_family_id'));
  ```
- **GraphQL context** sets `app.current_family_id` via JWT claim `sub` → lookup family → set session variable
- **Tenant-aware resolvers** use `@CurrentFamilyId()` parameter decorator
- **Cross-tenant leakage prevention** verified via integration tests (see `pilot/outputs/tenant_isolation_test.json`)

### 4.5 Usage Tracking System

**Purpose:** Enforce plan limits, show usage in billing dashboard, detect abuse.

**Proposed implementation:**
```prisma
model UsageRecord {
  id        String   @id @default(uuid())
  userId    String
  metric    String   // AI_TUTOR_SESSIONS | QUESTS_CREATED | BIOMETRIC_DAYS | etc.
  count     Int      @default(1)
  periodStart DateTime
  periodEnd   DateTime
  createdAt  DateTime @default(now())
}
```

**Usage flow:**
1. Before executing a billable action, query `UsageRecord` for current period
2. If limit exceeded, return error or prompt upgrade
3. After action, upsert `UsageRecord.count += 1`
4. Frontend shows usage bar: "10 of 100 AI Tutor sessions used this month"
5. Reset monthly via cron job (`@nestjs/schedule`)

---

## 5. IMPLEMENTATION SUMMARY

The following productization work has been completed in the codebase:

### 5.1 Auth Flow Completion

| Component | Location | Status | Details |
|-----------|----------|--------|---------|
| Firebase Auth integration | `services/api/src/auth/auth.service.ts` | ✅ Backend complete | Firebase token verification, user upsert with `UserMaster` creation, JWT minting, audit logging. Doter auto-creation for CHILD role. |
| JWT strategy | `services/api/src/auth/strategies/jwt.strategy.ts` | ✅ Complete | Extracts user from JWT payload, attaches to GraphQL context. |
| Role-based guards | `services/api/src/auth/guards/roles.guard.ts` | ✅ Complete | `RolesGuard` reads `@Roles()` decorator, checks `user.role` against allowed roles. |
| Login page UI | `apps/web/src/app/auth/login/page.tsx` | ⚠️ Needs wiring | Form UI + spinner exist but use `setTimeout` mock instead of Firebase SDK. Google button is no-op. |
| Register page UI | `apps/web/src/app/auth/register/page.tsx` | ⚠️ Needs wiring | 3-step wizard UI exists but uses `setTimeout` mock. Backend resolver `loginWithFirebase` exists but frontend doesn't call it. |

### 5.2 Onboarding Wizard Component

| Component | Location | Status | Details |
|-----------|----------|--------|---------|
| Multi-step registration | `apps/web/src/app/auth/register/page.tsx` | ✅ Frontend UI | Role selection, name/email/password, child details, COPPA consent, Doter introduction. Step progress bar with visual indicators. |
| COPPA consent UI | Step 1 of register | ✅ Frontend UI | Credit card verification ($0.01 hold) and government ID upload options presented with clear explanation. |
| Doter naming | Step 2 of register | ⚠️ Summary only | Shows egg and summary but no actual naming input. `nameMyDoter` mutation exists in queries but not wired. |

### 5.3 Sidebar Modernization

| Component | Location | Status | Details |
|-----------|----------|--------|---------|
| `lucide-react` dependency | `apps/web/package.json` | ✅ Available | Version 0.378.0 is installed but not imported anywhere. |
| Sidebar component | `apps/web/src/components/Sidebar.tsx` | ⚠️ Needs icon swap | All 22 nav items use emoji (🏠, 🐣, etc.). Should be replaced with `lucide-react` imports (e.g., `Home`, `Egg`, `Bell`, `Sword`, `Target`, `Calendar`, `GraduationCap`, `Brain`, `Camera`, `Heart`, `Landmark`, `Briefcase`, `Users`, `MessageCircle`, `Shield`, `CrystalBall`, `Trophy`, `Globe`, `Store`, `Settings`, `LogOut`). |

### 5.4 Empty/Loading/Error States

| Component | Location | Status | Details |
|-----------|----------|--------|---------|
| Loading skeleton | `apps/web/src/app/dashboard/page.tsx` | ✅ Complete | Shimmer-based skeleton matching the 2-column dashboard layout structure. |
| Notifications empty state | `apps/web/src/app/dashboard/notifications/page.tsx` | ✅ Complete | "All caught up!" with bell emoji and descriptive text. |
| Notifications loading state | Same file | ✅ Complete | "Loading notifications..." centered text in glass card. |
| Family Hub empty state | `apps/web/src/app/dashboard/family/page.tsx` | ✅ Complete | "No children linked yet" with call-to-action button. |
| Family Hub loading state | Same file | ✅ Complete | "Loading family data..." centered text. |
| Settings loading state | `apps/web/src/app/dashboard/settings/page.tsx` | ✅ Complete | "Loading settings..." centered text. |

**Still missing:**
- Error boundaries at page level (`react-error-boundary`)
- Error states in ChildDashboard (if GraphQL fails)
- Error states in ParentDashboard
- Empty state for quests in ChildDashboard (currently maps over possibly-empty array with no fallback)
- Empty state for goals in ChildDashboard

### 5.5 Breadcrumb Navigation System

**Status:** ❌ Not implemented. No breadcrumb component exists.

**Action items remaining:**
- Create `Breadcrumbs.tsx` component at `apps/web/src/components/Breadcrumbs.tsx`
- Component should accept `items: { label: string; href?: string }[]` and render with chevron separators
- Each dashboard page should declare breadcrumbs via a context or prop
- Use `lucide-react` `ChevronRight` icon as separator
- Example: `Dashboard > Doter > Evolution`
- Add `@theme` support for dark/light mode

### 5.6 User Profile Completion System

| Component | Location | Status | Details |
|-----------|----------|--------|---------|
| Profile settings | `apps/web/src/app/dashboard/settings/page.tsx` | ✅ Basic | Display name editing, email viewing, role display. Notification preferences (local only, no persistence). |
| `UPDATE_PROFILE` mutation | `apps/web/src/lib/queries.ts` | ✅ Query exists | GraphQL mutation `updateProfile(data: UpdateProfileInput!)` returns `id`, `displayName`, `avatarUrl`. |
| Profile photo | Sidebar user card | ⚠️ Partial | Shows `user.avatarUrl` if available, else 👤 emoji fallback. No upload UI. |

**Missing:**
- Avatar upload (S3 presigned URL + crop UI)
- Accessibility settings (dyslexia mode, high contrast, TTS, font size — these exist in `auth.service.ts` user creation defaults but have no settings UI)
- Password change form
- Email change with verification
- Account deletion flow

### 5.7 Feature Flag Service

**Status:** ❌ Not implemented. No feature flag infrastructure exists.

### 5.8 Subscription Management UI

**Status:** ❌ Not implemented. No billing/subscription UI exists.

**Frontend pages needed:**
- `/dashboard/billing` — Plan comparison table, current plan badge, upgrade button
- `/dashboard/billing/checkout` — Stripe Checkout redirect page
- `/dashboard/billing/portal` — Stripe Customer Portal redirect (manage payment method, cancel)
- `/dashboard/billing/history` — Invoice list

### 5.9 Billing Dashboard

**Status:** ❌ Not implemented. No billing dashboard exists.

**Backend work needed:**
- `Subscription` and `UsageRecord` Prisma models
- `BillingModule` in NestJS
- Stripe webhook endpoint (`POST /webhooks/stripe`)
- Usage tracking decorator/interceptor
- Plan enforcement guard (`@Plan('PRO', 'ENTERPRISE')`)

---

**Total pages examined:** 30+ frontend routes, 22 backend modules
**Emoji replacements needed:** ~50+ instances across all components
**Mocked features:** Auth (Login + Register), Notifications unread count, COPPA verification, most GraphQL resolvers returning static fallback data
**Production-ready components:** Loading skeletons (1), Empty states (3), Design system (CSS variables, glassmorphism, animations), Role-based routing, Doter evolution visualization, Biometric chart
**Missing critical SaaS infrastructure:** Billing, Subscription management, Feature flags, Usage tracking, Tenant isolation, Admin UI, Email service, Email verification, Password reset, Error boundaries, Breadcrumbs, Accessibility (aria labels, keyboard nav), Dark/light mode toggle, Mobile responsive hamburger menu
