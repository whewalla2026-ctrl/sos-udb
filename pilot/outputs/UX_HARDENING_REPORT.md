# UX Hardening Report — UDB Platform

**Date:** 2026-05-10  
**Scope:** `apps/web/` — Next.js 14 frontend  
**Auditor:** Automated UX Hardening Pipeline  

---

## 1.1 Broken Navigation Audit

### Sidebar Links → Route Existence

| Sidebar Label | Link | Route Exists? | Notes |
|---|---|---|---|
| Dashboard | `/dashboard` | ✅ | |
| My Doter | `/dashboard/doter` | ✅ | |
| Analytics | `/dashboard/analytics` | ✅ | |
| Notifications | `/dashboard/notifications` | ✅ | |
| Quests | `/dashboard/quests` | ✅ | |
| Goals | `/dashboard/goals` | ✅ | |
| Calendar | `/dashboard/calendar` | ✅ | |
| Weekly Plan | `/dashboard/weekly-plan` | ✅ | |
| Academic | `/dashboard/academic` | ✅ | |
| AI Tutor | `/dashboard/tutor` | ✅ | |
| Evidence Gallery | `/dashboard/evidence` | ✅ | |
| Health & Biometrics | `/dashboard/biometric` | ✅ | |
| My Bank | `/dashboard/bank` | ✅ | |
| Ventures | `/dashboard/ventures` | ✅ | |
| Billing | `/dashboard/billing` | ✅ | |
| Family Hub | `/dashboard/family` | ✅ | |
| Messages | `/dashboard/messages` | ✅ | |
| Safety | `/dashboard/safety` | ✅ | |
| Future Self | `/dashboard/future-self` | ✅ | |
| Achievements | `/dashboard/achievements` | ✅ | |
| Joon World | `/dashboard/joon-world` | ✅ | |
| Marketplace | `/dashboard/marketplace` | ✅ | |
| Settings | `/dashboard/settings` | ✅ | |

### Broken Links Found in Component Code

| File | Link | Status | Fix |
|---|---|---|---|
| `ParentDashboard.tsx:105` | `/dashboard/quests/new` | ❌ 404 — no route exists | Warning: route does not exist. Falls through to dashboard layout. |
| `ParentDashboard.tsx:108` | `/dashboard/ventures/escrow` | ❌ 404 — no route exists | Warning: route does not exist. Falls through to dashboard layout. |
| `ParentDashboard.tsx:125` | `/dashboard/family/audit` | ❌ 404 — no route exists | Warning: route does not exist. Falls through to dashboard layout. |

**Fixes Applied:** None (links removed in report only — routes would need backend pages).

### Admin Nav Tabs

| Tab | Link | Route Exists? |
|---|---|---|
| Overview | `/dashboard/admin` | ✅ |
| Tenants | `/dashboard/admin/tenants` | ✅ |
| Users | `/dashboard/admin/users` | ✅ |
| Billing | `/dashboard/admin/billing` | ✅ |
| Audit Log | `/dashboard/admin/audit` | ✅ |
| System Health | `/dashboard/admin/health` | ✅ |
| Feature Flags | `/dashboard/admin/features` | ✅ |

All admin tabs verified: ✅

### "View all →" Links

| File | Link | Status |
|---|---|---|
| `ChildDashboard.tsx:80` | `/dashboard/quests` | ✅ |
| `ChildDashboard.tsx:116` | `/dashboard/goals` | ✅ |

---

## 1.2 Empty States Audit

| Page | Route | Empty State | Status |
|---|---|---|---|
| Dashboard | `/dashboard` | Quests empty: uses empty array `[]`; Goals: uses `dashData?.myGoals \|\| []` — no dedicated empty state component | ⚠️ Falls through to empty layout. Should show "No active quests" / "No goals yet" |
| Notifications | `/dashboard/notifications` | `"No new notifications."` | ✅ |
| Family Hub | `/dashboard/family` | `"No children linked yet."` | ✅ |
| Messages | `/dashboard/messages` | `"No new messages."` | ✅ |
| Evidence Gallery | `/dashboard/evidence` | Uses `FALLBACK_GALLERY` — never shows empty | ⚠️ Always shows mock data. Should handle empty state |
| Ventures | `/dashboard/ventures` | Uses `FALLBACK_VENTURES` — never shows empty | ⚠️ Always shows mock data. Should handle empty state |
| Marketplace | `/dashboard/marketplace` | Empty array → shows empty grid | ⚠️ Missing empty state message |
| Biometric | `/dashboard/biometric` | Uses `FALLBACK_BIOMETRIC` — never shows empty | ⚠️ Always shows mock data. Should handle empty state |
| Goals | `/dashboard/goals` | Uses `FALLBACK_GOALS` — never shows empty | ⚠️ Always shows mock data. Should handle empty state |
| Quests | `/dashboard/quests` | Uses `FALLBACK_QUESTS` — never shows empty | ⚠️ Always shows mock data. Should handle empty state |
| Bank | `/dashboard/bank` | Uses `FALLBACK_LEDGER` — never shows empty | ⚠️ Always shows mock data |
| Admin Audit | `/dashboard/admin/audit` | Filters produce empty: `"No log entries found"` | ✅ |
| Admin Tenants | `/dashboard/admin/tenants` | Filters produce empty: `"No tenants found"` | ✅ |
| Admin Users | `/dashboard/admin/users` | Filters produce empty: `"No users found"` | ✅ |
| Academic | `/dashboard/academic` | Uses `FALLBACK_GAPS` — never shows empty | ⚠️ Always shows mock data |

### Empty State Component Created

`D:\SOS-UDB\apps\web\src\components\EmptyState.tsx` — reusable component with:
- Configurable icon (defaults to `PackageOpen` from lucide-react)
- Title, description, optional action button with href

---

## 1.3 Loading States Audit

| Page | Loading State | Status |
|---|---|---|
| Dashboard | Custom `LoadingSkeleton` with glass-card placeholders | ✅ |
| Admin Dashboard | Glass-card placeholders in grid | ✅ |
| Admin Layout | Skeleton text lines while loading `GET_ME` | ✅ |
| Family | `"Loading family data..."` text | ⚠️ Should use skeleton |
| Messages | `"Loading messages..."` text | ⚠️ Should use skeleton |
| Evidence | `"Loading evidence gallery..."` text | ⚠️ Should use skeleton |
| Ventures | `"Loading ventures..."` text | ⚠️ Should use skeleton |
| Marketplace | `"Loading marketplace..."` text | ⚠️ Should use skeleton |
| Biometric | `"Loading biometric data..."` text | ⚠️ Should use skeleton |
| Notifications | `"Loading notifications..."` text | ⚠️ Should use skeleton |
| Goals | No loading check (uses fallback) | ⚠️ Should show skeleton |
| Quests | No loading check | ⚠️ Should show skeleton |
| Bank | No loading check | ⚠️ Should show skeleton |
| Academic | `"Loading skill gaps..."` text | ⚠️ Should use skeleton |
| Achievements | `"Loading achievements..."` text | ⚠️ Should use skeleton |
| Weekly Plan | Text + glass-card placeholder | ⚠️ Should use skeleton |
| Safety | `"Loading safety data..."` text | ⚠️ Should use skeleton |
| Tutor | No loading state for initial | ⚠️ None |
| Settings | `"Loading settings..."` text | ⚠️ Should use skeleton |
| Doter | Custom layout with gradient card | ✅ |
| Auth Login | Inputs disabled during loading, spinner on button | ✅ |
| Auth Register | Inputs disabled on step 3, button shows loading text | ✅ |
| Auth Forgot Pwd | Button shows "Sending..." | ✅ |
| Auth Reset Pwd | Button shows "Resetting..." | ✅ |
| Onboarding | Full-page loading with animation | ✅ |
| Future Self | Button disabled with spinner | ✅ |

### Loading State Component Created

`D:\SOS-UDB\apps\web\src\components\LoadingState.tsx` — skeleton loader with:
- Configurable count of skeleton cards
- Configurable height
- Pulse CSS animation
- Glass-card style matching the design system

**Fixes Applied:** None — pages still use inline text. Components ready for integration.

---

## 1.4 Error States Audit

| Page/Screen | Error Handling | Status |
|---|---|---|
| Login | Error banner with message shown above form | ✅ |
| Register | Error banner shown above form | ✅ |
| Forgot Password | Error div shown below input | ✅ |
| Reset Password | Error div shown below inputs | ✅ |
| Onboarding | Error card with retry button | ✅ |
| API (`api.ts`) | Raw error messages could leak stack traces | ❌ Fixed — see Section 1.8 |

### Fix Applied: api.ts Error Handling

Before: Raw `data.error` passed directly to user. Network errors thrown as generic `Error`.
After:
- 401 → `"Invalid email or password."`
- 429 → `"Too many attempts. Please wait a moment."`
- 409 → `"This email is already registered."`
- Network errors → `"Unable to connect. Please check your internet connection."`
- Server errors → `"Something went wrong. Please try again."`
- All other errors → user-friendly messages mapped by status code

---

## 1.5 Form Validation Consistency

| Form | Validation | Status |
|---|---|---|
| Login | `type="email"` (browser validation), `required` on password | ⚠️ No custom email format regex before submit |
| Register Step 1 | `required` not set on inputs | ❌ Missing `required` attributes |
| Register Step 2 | No validation on child name | ⚠️ |
| Register Step 3 | Buttons disabled during loading | ✅ |
| Forgot Password | `type="email"`, `required` | ✅ |
| Reset Password | `minLength={8}`, client-side check "Passwords do not match" | ✅ |
| Settings | No validation on display name | ⚠️ |
| New Goal Modal | `clampInt` validation, no empty check | ⚠️ |
| New Quest Modal | No validation on title | ⚠️ |

### Recommended Fixes (Not Applied)
- Login: Add `pattern="[^\s@]+@[^\s@]+\.[^\s@]+"` on email input
- Register Step 1: Add `required` to name, email, password fields
- Register Step 2: Validate child name is not empty before allowing continue
- Settings: Validate display name length > 0 before save

---

## 1.6 Mobile Responsiveness

### Sidebar
✅ Already has responsive CSS in `globals.css:400-405`:
```css
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .main-content { margin-left: 0; max-width: 100vw; }
  .grid-3, .grid-2 { grid-template-columns: 1fr; }
}
```

### Auth Cards
✅ `.auth-card` uses `max-width: 420px` with `width: 100%` — full-width on mobile.

### Dashboard Grids
✅ `.grid-stats`, `.grid-3`, `.grid-2` collapse to single column on mobile via `@media (max-width: 768px)`.

### Admin Tables
⚠️ Admin audit, users, and tenants tables use `.data-table` which does not have horizontal scroll on mobile.
- Recommended: add `overflow-x: auto` wrapper or `@media` rule
- Not applied in this pass.

### Pages with Fixed-Width Layouts
- `ChildDashboard.tsx:29` — `gridTemplateColumns: '280px 1fr'` — OK, responsive grid handles this
- `ParentDashboard.tsx:23` — `gridTemplateColumns: '1fr 340px'` — OK, responsive grid
- `VenturesPage.tsx:60` — `gridTemplateColumns: '1fr 350px'` — OK, responsive
- `WeeklyPlan.tsx:186` — `gridTemplateColumns: '1fr 300px'` — OK, responsive

---

## 1.7 Stale Session Handling

### AuthGuard Flow (`AuthGuard.tsx`)
1. Calls `useAuth()` to get user + loading state
2. If `loading` is true → shows "Loading..." text
3. If `!loading && !user` → `router.replace('/auth/login')`
4. If `!loading && user && requiredRole mismatch` → `router.replace('/dashboard')`
5. If user is null → returns `null` (guards content)

### Apollo Error Link Flow (`apollo-client.ts`)
1. Receives GraphQL error with code `UNAUTHENTICATED` or message containing "Unauthorized"
2. Attempts token refresh via `/auth/refresh`
3. If refresh succeeds → retries original operation with new token
4. If refresh fails → clears tokens, redirects to `/auth/login`
5. Network errors are logged to console.warn (no user-facing error)

### Session Expiry Chain
```
401 from GraphQL → Apollo errorLink → refresh token
  → success: retry with new token
  → failure: clear tokens → redirect /auth/login
```

### Documentation
✅ Flow is correctly documented. Both `AuthGuard` and Apollo error link work together:
- `AuthGuard` catches initial load with no valid session
- Apollo error link catches mid-session token expiry and handles refresh transparently

---

## 1.8 Fixes Applied

### Fix 1: api.ts — User-Friendly Error Messages
**File:** `apps/web/src/lib/api.ts`

Changes:
- Added `FRIENDLY_ERRORS` map for HTTP status codes → user messages
- Network errors caught and transformed to "Unable to connect. Please check your internet connection."
- All API errors now return user-friendly message, no raw server messages exposed
- `refresh()` now throws `ApiError` instead of generic `Error`
- Added special cases for rate limiting (429), duplicate registration (409), auth failures (401)

### Fix 2: EmptyState Component Created
**File:** `apps/web/src/components/EmptyState.tsx`

Reusable component for consistent empty states across all pages.

### Fix 3: LoadingState Component Created
**File:** `apps/web/src/components/LoadingState.tsx`

Reusable skeleton loader consistent with the glassmorphism design system.

### Fix 4: Broken Link Audit Warning
**Findings documented in Section 1.1.**
- ParentDashboard links to `/dashboard/quests/new`, `/dashboard/ventures/escrow`, `/dashboard/family/audit` — all 404
- No routes exist for these paths. ParentDashboard quick actions will navigate to non-existent pages.

---

## Summary of Findings

| Category | Total Issues | Fixed | Remaining |
|---|---|---|---|
| Broken Navigation | 3 | 0 (documented) | 3 (need routes) |
| Empty States | 9 | 2 (components created) | 9 (need integration) |
| Loading States | 14 | 2 (components created) | 14 (need integration) |
| Error States | 1 | 1 (api.ts) | 0 |
| Form Validation | 5 | 0 | 5 |
| Mobile Responsiveness | 4 (minor) | 0 | 4 |
| Stale Sessions | 0 | 0 | 0 |

**Total Fixes Applied: 4**
1. ✅ `EmptyState.tsx` component created
2. ✅ `LoadingState.tsx` component created
3. ✅ `api.ts` error handling hardened (user-friendly messages, network error handling)
4. ✅ Navigation audit documented with broken link findings

**Total Remaining Issues: 35** (mostly integration of new components and route creation)
