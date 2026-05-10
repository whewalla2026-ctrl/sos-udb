# Onboarding Flow Specification

## Overview

The UDB onboarding flow transforms a visitor into an active, engaged user within a single session. The flow is role-aware (PARENT vs CHILD), COPPA-compliant, and gamified to drive completion. Onboarding spans registration through first-quest completion across 9 phases.

---

## 1. Pre-Onboarding (Registration)

### Entry Points

| Source | Route | CTA |
|---|---|---|
| Landing page hero | `/` | "🚀 Start Your Journey" links to `/auth/register` |
| Landing page CTA | `/` | "🌟 Create Free Account" links to `/auth/register` |
| Login page | `/auth/login` | "New to UDB? Create a family account" links to `/auth/register` |
| Direct navigation | `/auth/register` | Bookmarked or shared link |

### Registration Wizard (`apps/web/src/app/auth/register/page.tsx`)

The registration page is a 3-step wizard:

#### Step 0: Account Creation
- **Role selection**: Two visual cards — "Parent / Guardian" (`role=PARENT`) and "Student (13+)" (`role=CHILD`).
- **Fields**: displayName, email (validated format), password (min 12 chars, mixed case, symbols required).
- **Validation**: Client-side email regex + password strength indicator. Server-side uniqueness check on email.
- **Edge case**: If `CHILD` role is selected and DOB indicates age < 13, show: "A parent or guardian needs to create the family account first. Please ask them to sign up!"

#### Step 1: Family Setup (COPPA Compliance)
- **Child name**: First name only (privacy by design — no last names for child accounts).
- **Child DOB**: Date picker restricted to ages 6-23. DOB < 13 triggers COPPA consent requirement.
- **COPPA consent methods**:
  - `CREDIT_CARD`: $0.01 temporary hold + immediate release (instant verification)
  - `ID_CHECK`: Government ID upload (manual review within 24h, delayed onboarding)
- **COPPA banner**: "We require verified parental consent for children under 13. Your consent method is secure and private." (`apps/web/src/app/auth/register/page.tsx:76-79`)

#### Step 2: Confirmation & Launch
- **Summary card**: Displays account name, email, child name, consent method with status checkmarks.
- **Doter preview**: "Meet [Child]'s Doter!" with egg emoji `🥚` animation.
- **Action**: Click "🚀 Launch UDB!" triggers `POST /auth/register` (or Firebase token exchange-based flow).

### Backend Processing (`services/api/src/auth/auth.service.ts`)

On form submission:
1. Firebase custom token or email/password account creation
2. `UserMaster` upsert in Prisma with `uupData` initialization:
   ```typescript
   uupData: {
     gamification: { level: 1, xp: 0, coin_balance: 0, doter_state: 'EGG', streak: 0 },
     academic: { math_rit: 0, reading_rit: 0, lms_sync_status: 'pending', skill_gaps: {} },
     biometric: { avg_sleep_hours: 0, stress_index: 0, focus_score: 0, last_sync: null },
     entrepreneurship: { active_projects: [], total_revenue_usd: 0, wallet_balance: 0 },
     metadata: { blockchain_wallet: null, coppa_consent: false },
   }
   ```
3. `UserRel` record created with role
4. `DoterProfile` created for CHILD role (`services/api/src/auth/auth.service.ts:79-83`)
5. `FamilyLink` linking parent to child
6. JWT minted with `{ sub, email, role }` payload
7. `AuditLog` entry: `USER_REGISTER`
8. Redirect to `/dashboard`

---

## 2. Welcome Wizard (Step-by-Step Guide)

On first login (detected by `createdAt === updatedAt` or an `isOnboarded: false` flag on the user record), the user is shown a welcome wizard before the full dashboard loads.

### Wizard Component

**File**: `apps/web/src/components/WelcomeWizard.tsx` (to be created)

### Steps

| Step | Title | Content | Role |
|---|---|---|---|
| 1 | "Welcome to UDB!" | Animated logo, platform tagline: "One Platform. Every Pillar of Growth." Brief 15s explainer video or animated intro. | ALL |
| 2 | "Your 4 Pillars" | Visual cards for Academic Mastery, Biometric Health, Gamification, Entrepreneurship. Each with icon and 1-line description. | ALL |
| 3 | (PARENT) "Your Family Dashboard" | Screenshot of parent dashboard highlighting: children overview, safety score, approval queue. | PARENT |
| 3 | (CHILD) "Meet Your Doter" | Doter intro: egg state, how evolution works (XP → level up → evolve). 3-card explainer. | CHILD |
| 4 | "Quick Setup" | Timezone selector, notification preferences (email/push), child age verification. | ALL |
| 5 | "Let's Go!" | Summary of what was set up. Countdown animation (3-2-1) then dismiss wizard. | ALL |

### Technical Implementation

- Wizard state stored in localStorage key `udb:welcome_seen` + confirmed in user preferences (`accessibilitySettings.onboardingComplete`).
- Wizard can be replayed from settings page.
- If user clicks "Skip Tour", wizard dismisses and set `onboardingComplete: true`.
- Progress bar shows step position (Step 2 of 5).

---

## 3. Role-Based Onboarding Paths

### CHILD Path

```
Register → Welcome Wizard → Doter Naming → First Quest → Dashboard
              (steps 1,2,3,4,5)    ↓               ↓
                              NameMyDoter     Auto-assign onboarding
                              mutation        quest via QuestService
```

- After wizard, child is directed to `/dashboard/doter` for the Doter naming ceremony
- First quest is automatically assigned based on child's age:
  - Ages 6-8: "Draw Your Favorite Animal" (Creativity quest)
  - Ages 9-12: "Complete Your Profile" (Setup quest)
  - Ages 13-15: "Baseline Math Assessment" (Academic quest)
  - Ages 16-18: "Future Self Intro" (Career quest)
  - Ages 19-23: "Set Your First Goal" (Goal quest)

### PARENT Path

```
Register → Welcome Wizard → Family Setup → Child Linking → Dashboard
              (steps 1,2,4,5)      ↓                 ↓
                              Add children       Link child accounts
                              form               (linkChild mutation)
```

- After wizard, parent is directed to `/dashboard/family` to complete family setup
- If parent registered with a child name, the child account is already linked (from registration step 1)
- Parent can invite additional family members via email
- Parent sees a checklist: "✓ Account created", "✓ Child linked", "○ Safety settings configured", "○ Subscription selected"

### ADMIN Path

```
Admin Invite → Set Password → Welcome Wizard → Admin Console
                    ↓               (admin-specific)
              Magic link or      Steps: platform overview,
              invite token       key metrics, quick tutorials
```

- Admin accounts are invite-only (not self-register)
- Invite email contains magic link with token
- On first login, admin is directed to `/dashboard/admin`
- Admin wizard shows: system health overview, user management quickstart, audit log primer

---

## 4. Profile Completion System

### Completion Percentage

Profile completion is calculated from required fields. The percentage drives a visual indicator in the sidebar and settings page.

| Field | Weight | Required For |
|---|---|---|
| `displayName` | 15% | All roles |
| `avatarUrl` | 10% | All roles |
| `timezone` | 10% | All roles |
| `accessibilitySettings` (3 sub-fields) | 15% | All roles |
| Doter named (child only) | 20% | CHILD |
| At least 1 quest completed | 15% | CHILD |
| At least 1 family member linked | 15% | PARENT |
| Safety settings configured | 15% | PARENT |

### Example Calculation

```
displayName: ✓ (15%)
avatarUrl: ✗ (0%)
timezone: ✗ (0%)
accessibilitySettings: ✓ partial (10%)
Doter named: ✓ (20%)
Quest completed: ✗ (0%)
Total: 15% + 10% + 20% = 45%
```

### Missing Field Prompts

Incomplete fields are surfaced as dismissible cards on the dashboard:

- **CHILD**: "🐣 Your Doter needs a name! [Name My Doter →]"
- **CHILD**: "📸 Add a profile picture to personalize your account"
- **PARENT**: "👨‍👩‍👧 Connect with your family — invite a child or co-parent"
- **PARENT**: "🛡️ Configure safety settings to monitor your child's activity"
- **ALL**: "🌍 Set your timezone for accurate weekly planning"

### Query Implementation

```graphql
# Proposed addition to schema.gql
type ProfileCompletion {
  percentage: Float!
  missingFields: [String!]!
  completedFields: [String!]!
}

# Add to Query:
# profileCompletion: ProfileCompletion!
```

Backend resolver aggregates by checking each field on the user record, DoterProfile, FamilyLink count, and Task completion status.

---

## 5. First-Time User Experience (Guided Tour, Tooltips)

### Guided Tour

On first dashboard load (when `isOnboarded === false`):

1. **Sidebar highlight**: The nav items pulse one at a time with a tooltip:
   - "🏠 Dashboard — Your daily snapshot"
   - "🐣 My Doter — Your evolving companion"
   - "⚔️ Quests — Complete tasks to earn XP and coins"
   - "🧠 AI Tutor — Get help without getting answers"
   - "🎯 Goals — Track your growth journey"

2. **Doter card tour**: An overlay highlights the Doter card with pointer:
   - "This is your Doter! It starts as an egg. Earn XP from quests to make it evolve."
   - "🔴 XP Bar — Fill it up to level up!"
   - "🟡 Coins — Spend them in the Marketplace"

3. **Quick actions tour**: Highlights the 6 quick action cards:
   - "Try these shortcuts to get started fast."

### Tooltips

Tooltips are implemented using `framer-motion` (in `apps/web/package.json:16`) for animated popovers:

| Element | Tooltip Text | Shown |
|---|---|---|
| Doter card | "Your Doter evolves as you grow. Complete quests to earn XP!" | First 3 visits |
| XP bar | "XP = Experience Points. 1000 XP evolves your Doter!" | First visit |
| Coin balance | "Coins are earned from quests. Spend them in the Marketplace!" | First visit |
| Notifications bell | "See your latest alerts here" | First visit |
| Weekly Plan | "Plan your week every Sunday for best results" | First 2 visits |
| AI Tutor | "Ask questions — get guided with hints, not answers" | First 3 visits |

### Implementation Approach

```typescript
// apps/web/src/hooks/useTooltips.ts
// Proposed hook to manage first-time tooltips
function useTooltips() {
  const [seenTooltips, setSeenTooltips] = useState<Set<string>>(new Set());

  const shouldShow = (key: string) => {
    if (!userProfile || userProfile?.accessibilitySettings?.onboardingComplete) return false;
    return !seenTooltips.has(key);
  };

  const dismiss = (key: string) => {
    setSeenTooltips(prev => new Set([...prev, key]));
    localStorage.setItem('udb:seen_tooltips', JSON.stringify([...seenTooltips, key]));
  };

  // After all 8 tooltips dismissed, mark onboarding complete
  useEffect(() => {
    if (seenTooltips.size >= 8) {
      // Optionally auto-complete onboarding
    }
  }, [seenTooltips]);
}
```

---

## 6. Doter Naming Ceremony

### Flow

1. After welcome wizard, child is redirected to `/dashboard/doter`
2. A modal appears: "🐣 Your Doter has hatched! Give it a name!"
3. Input field with character limit (2-20 chars, alphanumeric + spaces)
4. Name suggestions based on age group:
   - Ages 6-8: "Sparky, Blu, Sunny, Pixel, Bubbles"
   - Ages 9-12: "Shadow, Nova, Ember, Echo, Blaze"
   - Ages 13-18: "Phoenix, Atlas, Orion, Stella, Kai"
   - Ages 19-23: Custom (no suggestions)
5. Name is validated: profanity filter check, uniqueness within tenant
6. On confirmation, `nameMyDoter(name)` mutation is called (`schema.gql:89`):

```graphql
mutation NameMyDoter($name: String!) {
  nameMyDoter(name: $name)
}
```

7. **Doter hatching animation**: Egg cracks, creature emerges with name displayed in animated text
8. `AuditLog` entry: `DOTER_NAMED`
9. If user skips naming ceremony, name defaults to "Dot" and a sidebar reminder (🔔) persists until named

### Error States

| Scenario | Handling |
|---|---|
| Name already taken in family | "That name is already used by a family member. Choose a unique name!" |
| Name flagged by profanity filter | "Oops, let's keep it family-friendly! Try another name." |
| Empty name submitted | "Your Doter needs a name! Try something fun like Sparky or Nova." |
| API failure | Retry modal with "Try Again" button. Show offline fallback: name stored locally, synced later. |

---

## 7. First Quest Assignment

### Automatic Assignment

After Doter naming (or on dashboard load if skipped), the system auto-assigns the first quest:

**File**: `services/api/src/quests/quests.service.ts`

```typescript
// Proposed logic
async assignOnboardingQuest(userId: string, age: number) {
  const questMap = {
    '6-8': { title: 'Draw Your Favorite Animal', pillar: 'CREATIVITY', xp: 50, coins: 10 },
    '9-12': { title: 'Complete Your Profile', pillar: 'LIFE_SKILLS', xp: 30, coins: 5 },
    '13-15': { title: 'Baseline Math Assessment', pillar: 'ACADEMIC', xp: 100, coins: 20 },
    '16-18': { title: 'Future Self: Day in the Life', pillar: 'LIFE_SKILLS', xp: 75, coins: 15 },
    '19-23': { title: 'Set Your First Goal', pillar: 'LIFE_SKILLS', xp: 50, coins: 10 },
  };

  const quest = await this.prisma.task.create({
    data: {
      userId,
      title: questData.title,
      status: 'AVAILABLE',
      milestone: 'ONBOARDING',
    },
  });

  // Send in-app notification
  await this.notificationsService.send(userId, {
    title: '⚔️ New Quest Available!',
    body: `${questData.title} — Earn ${questData.xp} XP and ${questData.coins} 🪙`,
  });

  return quest;
}
```

### Quest Card Presentation

On `/dashboard/quests`, the first quest is prominently displayed as a hero card (larger, animated border glow) with:
- Pillar badge
- XP and coin rewards highlighted
- "⚡ NEW" badge
- Quest description with age-appropriate language
- "Accept Quest" CTA

### Completion Reward

On first quest completion:
- Double XP bonus: "🎉 First Quest Bonus! +2x XP earned!"
- Special achievement unlocked: "🌱 First Steps" badge
- Doter evolves from EGG to BABY if not already evolved
- Milestone marked in user `uupData.metadata.firstQuestCompletedAt`

---

## 8. Progress Tracking During Onboarding

### Onboarding Progress Object

```typescript
interface OnboardingProgress {
  registrationComplete: boolean;  // Step 1
  familySetupComplete: boolean;   // Step 2
  welcomeWizardComplete: boolean; // Step 3
  doterNamed: boolean;            // Step 4
  firstQuestAssigned: boolean;    // Step 5
  firstQuestCompleted: boolean;   // Step 6
  profileComplete: boolean;       // Step 7 (optional)
  overallPercent: number;         // 0-100
}
```

### Storage

- Stored in Redis: `onboarding:{userId}:progress` (JSON)
- Synced to user `uupData.onboarding` field after each step
- Progress read by frontend to show onboarding checklist

### UI Component

A collapsible "🚀 Getting Started" checklist panel on the dashboard:

```
☐ Create Account          ✓
☐ Set Up Family           ✓
☐ Welcome Tour            ✓
☐ Name Your Doter         ◉  ← current step
☐ Complete First Quest    ☐
☐ Profile Complete        ☐
                          
Overall: 60% ████████░░░░
```

### Persistence

Onboarding state persists across sessions. If user closes browser during step 3, they resume at step 3 on next login.

### Step Tracking Queries

```graphql
# Proposed
query OnboardingStatus {
  onboardingProgress {
    overallPercent
    stepsCompleted
    currentStep
    missingActions
  }
}
```

---

## 9. Completion Criteria (User is "Onboarded")

### Definition

A user is considered **fully onboarded** when ALL of the following criteria are met:

| Criteria | CHILD | PARENT | ADMIN |
|---|---|---|---|
| Account created | ✓ | ✓ | ✓ |
| Email verified | ✓ | ✓ | ✓ (admin invite) |
| Welcome wizard completed | ✓ | ✓ | ✓ |
| Doter named | ✓ | N/A | N/A |
| First quest accepted | ✓ | N/A | N/A |
| At least 1 family member linked | N/A | ✓ | N/A |
| Profile at 70%+ complete | ✓ | ✓ | ✓ |
| Timezone set | ✓ | ✓ | ✓ |
| Notification preferences configured | ✓ | ✓ | ✓ |

### Onboarding Flag

Once all criteria are met:

```typescript
await this.redis.set(`onboarding:${userId}:complete`, 'true');
// Also persists to user record
await this.prisma.user.update({
  where: { id: userId },
  data: {
    uupData: {
      ...currentUupData,
      onboarding: {
        complete: true,
        completedAt: new Date().toISOString(),
      },
    },
  },
});
```

### Post-Onboarding Behavior

- Onboarding checklist panel is removed from dashboard
- Sidebar no longer shows tooltip highlights
- Welcome wizard is suppressed on future logins
- User is eligible for "power user" features (e.g., weekly planning, marketplace selling)
- New onboarding quests are unlocked (e.g., "Invite a Friend", "Set a Recurring Goal")
- A congratulatory message appears: "🎉 You're all set! Welcome to the UDB community."

### Re-onboarding Edge Cases

| Scenario | Action |
|---|---|
| User returns after 6+ months | Show "Welcome Back" card with new features tour |
| New child added to family | Child goes through CHILD onboarding (not parent) |
| Admin changes role from CHILD to PARENT | Reset onboarding for PARENT requirements |
| Family merges with another family | Preserve individual onboarding status per user |

---

## Appendix: Onboarding-Related Code Paths

| File | Purpose |
|---|---|
| `apps/web/src/app/page.tsx` | Landing page, primary entry point |
| `apps/web/src/app/auth/register/page.tsx` | 3-step registration wizard |
| `apps/web/src/app/auth/login/page.tsx` | Login with Google SSO and email/password |
| `apps/web/src/app/dashboard/page.tsx` | Role-based dashboard routing |
| `apps/web/src/components/ChildDashboard.tsx` | Child's first dashboard view |
| `apps/web/src/components/ParentDashboard.tsx` | Parent's first dashboard view |
| `apps/web/src/components/Sidebar.tsx` | Navigation with role-based menu items |
| `apps/web/src/app/dashboard/doter/page.tsx` | Doter detail / naming ceremony page |
| `apps/web/src/app/dashboard/family/page.tsx` | Family hub for parent linking |
| `apps/web/src/app/dashboard/settings/page.tsx` | Profile completion and settings |
| `services/api/src/auth/auth.service.ts` | User creation, Doter profile init |
| `services/api/src/doter/doter.service.ts` | Doter naming, evolution logic |
| `services/api/src/quests/quests.service.ts` | First quest assignment |
| `services/api/src/family/family.service.ts` | Family linking, COPPA handling |
| `services/api/src/shared/user-role.ts` | Role enum (PARENT, CHILD, ADMIN) |
| `prisma/schema.prisma` | User, DoterProfile, FamilyLink models |
