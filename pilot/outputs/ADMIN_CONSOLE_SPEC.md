# Admin Console Specification

**Route prefix:** `/dashboard/admin/*`
**Authentication:** Requires `role: ADMIN` (enforced by `RolesGuard` at `services/api/src/auth/guards/roles.guard.ts`)
**Layout:** Extends the existing dashboard layout (`apps/web/src/app/dashboard/layout.tsx`) with an admin-specific sidebar

## Page Structure

```
/dashboard/admin/
├── page.tsx                    # Admin Dashboard (overview)
├── tenants/
│   ├── page.tsx                # Tenant list + search
│   └── [tenantId]/
│       └── page.tsx            # Tenant detail view
├── users/
│   ├── page.tsx                # User list + search + filter
│   └── [userId]/
│       └── page.tsx            # User profile detail
├── billing/
│   └── page.tsx                # Revenue charts + subscriptions + invoices
├── health/
│   └── page.tsx                # System health dashboard
├── audit/
│   └── page.tsx                # Audit log viewer
└── features/
    └── page.tsx                # Feature flag management
```

## 1. Admin Dashboard (`/dashboard/admin`)

### Overview Widgets

Four metric cards displayed in a 2x2 grid at the top:

| Widget | Source | Refresh | Description |
|--------|--------|---------|-------------|
| **Total Users** | `users.service.ts` count | 60s | Active user accounts (PARENT + CHILD + ADMIN) |
| **Active Today** | Metric from monitoring signals | 60s | Users with activity in last 24h (`lastSeenAt > now - 24h`) |
| **Revenue (MTD)** | Stripe/Subscription aggregation | 300s | Monthly recurring revenue from Pro + Enterprise |
| **System Health** | Monitoring service health endpoint | 30s | Aggregate status of all services (healthy/degraded/down) |

Each widget is a glassmorphism card (`var(--bg-glass)`) with:
- Icon (left-aligned, 32px)
- Metric value (large, bold, 2rem)
- Label (muted text, 0.75rem)
- Trend indicator (green up / red down arrow with percentage change from previous period)
- Skeleton loader while data loads

### Recent Activity Feed

Below the widgets, a scrollable list of recent system events sourced from the audit log:
- New user registrations (last 10)
- Plan changes (upgrades/downgrades)
- Alert triggers
- Each entry shows: timestamp, action type badge, actor email, brief description
- Auto-refreshes every 30 seconds via Apollo `pollInterval`

### Quick Actions

A sidebar panel with shortcut buttons:
- **Impersonate User** — opens a user search modal
- **System Alert** — creates a broadcast notification to all users
- **Refresh Cache** — invalidates Redis caches for feature flags and tenant plans
- **Run Report** — generates a SaaS margin intelligence report (triggers `tenant_cost_attribution.json` pipeline)

## 2. Tenant Management (`/dashboard/admin/tenants`)

### List View

A full-page data table with:

**Columns:**
| Column | Sortable | Filterable | Description |
|--------|----------|------------|-------------|
| Tenant ID | Yes | Yes | UUID, truncated in display |
| Plan | Yes | Yes (multi-select: Free/Pro/Enterprise) | Badge-colored pill |
| Parent Count | Yes | No | Number of parent accounts |
| Child Count | Yes | No | Number of child accounts |
| Storage Used | Yes | No | Aggregate MB across all users |
| Status | Yes | Yes (Active/Suspended) | Green active / red suspended badge |
| Last Activity | Yes | No | Most recent `lastSeenAt` across tenant |
| Created | Yes | Yes (date range) | Account creation date |

**Controls:**
- **Search bar** — searches by tenant ID, parent email, or family name (debounced 300ms, server-side filtering via GraphQL)
- **Filter dropdowns** — Plan (checkboxes), Status (radio), Date range (calendar picker)
- **Sort** — click any column header (asc/desc toggle, single-column sort)
- **Pagination** — 25/50/100 per page, page number input, prev/next buttons
- **Export CSV** — downloads current filtered view as CSV

### Tenant Detail View (`/dashboard/admin/tenants/[tenantId]`)

Three-tab layout:

**Tab 1: Overview**
- Plan card (current plan, price, billing period dates)
- Usage meters (requests/min, AI hints/day, storage, queues/day) with "X of Y used" labels and progress bars
- Family tree visualization (parent-child links from `FamilyLink` model)
- Quick actions: Suspend Tenant, Change Plan, Delete Tenant (w/ confirmation modal)

**Tab 2: Users**
- Sub-table of all users in the tenant (scoped by `parentId` or `childId` through `FamilyLink`)
- Columns: Name, Email, Role, Last Seen, Status
- Actions: View Profile, Impersonate, Deactivate

**Tab 3: Activity**
- Audit log entries filtered to this tenant's users
- Same columns as audit log viewer (timestamp, actor, action, target, IP)
- Time range filter (24h, 7d, 30d, custom)

### Suspend/Activate Flow

1. Admin clicks "Suspend Tenant"
2. Confirmation modal: "This will prevent all users in this tenant from accessing UDB. Are you sure?"
3. Confirmation text input: type the word "SUSPEND" to confirm
4. On confirm: `mutation suspendTenant(tenantId)` sets `tenant:{id}:suspended` flag in Redis, all subsequent gateway requests for this tenant return 403
5. Audit log entry created with action `TENANT_SUSPEND`
6. Reactivate follows the same flow but clears the suspended flag

## 3. User Management (`/dashboard/admin/users`)

### List View

Similar to tenant list but for individual users:

**Columns:**
| Column | Sortable | Filterable | Description |
|--------|----------|------------|-------------|
| Email | Yes | Yes | User email address |
| Display Name | Yes | Yes | User's display name |
| Role | Yes | Yes (PARENT/CHILD/ADMIN) | Role badge (color-coded) |
| Plan | Yes | Yes | Inherited from tenant |
| Last Seen | Yes | No | `lastSeenAt` timestamp |
| Created | Yes | Yes (date range) | Account creation |
| Tenant ID | No | Yes | Parent tenant UUID |

**Search:** Searches across email, displayName, and id (exact match on UUID)

**Bulk actions:** Checkbox multi-select with actions bar:
- Deactivate Users
- Change Plan
- Export Selected as CSV

### User Profile View (`/dashboard/admin/users/[userId]`)

Displays a comprehensive profile summary:

**Section 1: Account Info**
- Email, display name, avatar, role, timezone
- COPPA consent status (`coppaConsentVerified` + `coppaConsentDate`)
- GDPR delete request flag (`gdprDeleteRequested`)
- Firebase UID
- Account creation date, last seen date

**Section 2: Family Links**
- If PARENT: list of linked children with links to their profiles
- If CHILD: list of linked parents
- FamilyLink consent verification status

**Section 3: Activity Summary**
- Recent quest completions (last 10, from `Quest` model)
- Recent login events (from audit log)
- Safety score trend (from `SafetyScore` model, last 30 days as mini sparkline)
- Streak data (from `Streak` model, per pillar)

**Section 4: Usage**
- AI hint usage (today, this month)
- Storage consumption
- Queues processed today

**Actions:**
- **Impersonate** — generates a temporary JWT with the target user's identity and redirects to `/dashboard` (immutable audit log entry `ADMIN_IMPERSONATE` created)
- **Deactivate** — sets `active: false` on user (future state; schema change needed)
- **Delete User** — GDPR-compliant deletion (anonymizes personal data, retains audit log)
- **Reset Password** — triggers Firebase password reset email

### Impersonation Flow

1. Admin clicks "Impersonate"
2. Audit log entry written (`action: ADMIN_IMPERSONATE`, targetId: user.id, actorId: admin.id)
3. Server generates a short-lived JWT (5-minute expiry) with `{ userId: target.id, role: target.role, impersonatorId: admin.id }`
4. Frontend stores impersonation flag in session storage
5. Admin is redirected to `/dashboard` as the target user
6. Top banner displays "Impersonating user@email.com [Stop Impersonation]"
7. Impersonation ends on JWT expiry or clicking "Stop" (clears session storage + redirects to admin panel)

## 4. Billing Overview (`/dashboard/admin/billing`)

### Revenue Charts

Three charts rendered with a charting library (recharts or chart.js):

**Chart 1: Monthly Recurring Revenue (MRR)**
- Line chart, 12-month view
- X-axis: months (Jan-Dec)
- Y-axis: dollar amount
- Series: Free ($0), Pro, Enterprise, Total
- Data source: aggregated from Stripe subscriptions + manual overrides
- Hover tooltip shows breakdown for each month

**Chart 2: Subscription Distribution**
- Donut/pie chart
- Segments: Free (60%), Pro (30%), Enterprise (10%)
- Center text: "X total subscriptions"
- Click segment → filtered tenant list by plan

**Chart 3: Revenue Per User (RPU)**
- Bar chart, grouped by month
- Bars: Free RPU, Pro RPU, Enterprise RPU
- Horizontal reference line at platform average RPU

### Key Metrics Bar

Below the chart section, a row of metric cards:
- **MRR** — current month recurring revenue (formatted as $X,XXX)
- **ARPU** — average revenue per user (total revenue / total paying users)
- **Churn Rate** — % of subscriptions canceled this month
- **Trial Conversion** — % of Free → Pro conversions this month
- **LTV** — estimated lifetime value (ARPU × average subscription months)

### Subscription Table

Searchable, sortable table of all subscriptions with columns:
- Tenant ID, Plan, Status (Active/Past Due/Canceled/Expired), Current Period Start, Current Period End, Amount, Actions (View Tenant, Change Plan, Cancel)

### Invoice Section

A secondary tab within billing showing recent Stripe invoices:
- Invoice number, tenant ID, amount, status (Paid/Open/Void/Uncollectible), paid date
- Link to Stripe dashboard for each invoice
- "Export Invoices" button (CSV download)

## 5. System Health (`/dashboard/admin/health`)

### Service Status Grid

A 4x4 grid (or 3-column wrap) displaying all 14 monitored signals from `services/api/prisma/phase3/services/monitoring-service.js:24-39`:

| # | Signal Name | Status Source | Typical Healthy Value |
|---|-------------|---------------|----------------------|
| 1 | api_gateway | Health endpoint | "healthy" |
| 2 | auth_service | Health endpoint | "healthy" |
| 3 | planner_service | Health endpoint | "healthy" |
| 4 | ai_service | Health endpoint | "healthy" |
| 5 | monitoring_service | Self-check | "healthy" |
| 6 | redis_connected | Redis ping | "healthy" (value: 1) |
| 7 | postgres_connected | Prisma connection | "healthy" (value: 1) |
| 8 | error_rate | Prometheus metrics | "healthy" (value: 0.0-0.05) |
| 9 | request_latency_p50 | Prometheus metrics | "healthy" (< 100ms) |
| 10 | request_latency_p95 | Prometheus metrics | "healthy" (< 300ms) |
| 11 | active_users | Session tracking | any positive integer |
| 12 | ai_budget_used | Budget tracking | "healthy" (< 0.8) |
| 13 | cost_per_user | Cost analytics | "healthy" (< $0.01) |
| 14 | queue_depth | Queue metrics | "healthy" (< 100) |

Each service is displayed as a glassmorphism card with:
- Service name and icon
- Status indicator: green dot (healthy), yellow dot (degraded), red dot (down)
- Uptime percentage (calculated from signal history)
- Current value (if numeric, with unit)
- Response time (ms, from circuit breaker metrics at `services/api/prisma/phase3/gateway.js:201-207`)
- Mini sparkline chart showing 24-hour trend

### Circuit Breaker Status

Beneath the grid, a "Circuit Breakers" section displays the state of each circuit breaker from the API gateway (`gateway.js:200-207`):
- State: CLOSED (green), OPEN (red), HALF_OPEN (yellow)
- Failure count, success count, cooldown remaining
- "Reset" button to manually close an open circuit breaker

### Event Bus Health

Stream lag metrics for each event bus stream (`monitoring-service.js:87-94`):
- Stream name (user_created, hint_generated, etc.)
- Current message count
- Dead letter queue count
- Consumer lag (messages pending)

## 6. Audit Log Viewer (`/dashboard/admin/audit`)

### Interface

Full-page searchable, filterable, paginated table of immutable audit log entries.

**Columns:**
| Column | Sortable | Description |
|--------|----------|-------------|
| Timestamp | Yes | ISO 8601 with relative display ("2 min ago") |
| Actor | No | Actor email + user ID link |
| Action | Yes | Badge-colored action type (UUP_SYNC, QUEST_APPROVE, FUND_RELEASE, etc.) |
| Target | No | Target type + target ID |
| Details | No | Expandable row showing JSON payload |
| IP Address | No | Originating IP |
| Blockchain | No | Anchor status (anchored/pending/not anchored) |

**Filters:**
- **Action type** — multi-select dropdown of all action enum values (populated from DB)
- **Actor** — search by email or user ID
- **Date range** — from/to date pickers
- **Target type** — multi-select (User, Quest, Escrow, etc.)

**Advanced features:**
- **JSON view** — click "Details" to expand a monospace-rendered JSON payload with syntax highlighting
- **Export** — CSV download of current filter results (max 10,000 rows)
- **Blockchain anchor** — for anchored logs (actions `UUP_SYNC` and `FUND_RELEASE`), a shield icon with tooltip "Verified on Polygon"

### Data Source

The audit log is stored in the `AuditLog` model (`schema.prisma:651-668`) which follows a WORM (Write Once, Read Many) pattern:
- `id` is auto-incrementing BigInt
- No update/delete operations are exposed
- High-integrity events are anchored to Polygon via `blockchain.service.ts`
- Backend endpoint: `GET /audit/log` (gateway.js:181-185) with ADMIN role check

## 7. Feature Flag Management (`/dashboard/admin/features`)

### Flag List

A card-based layout (not a table) showing all feature flags. Each card contains:

- **Flag key** (monospace font, e.g., `aiTutor`)
- **Type badge** (boolean / percentage / plan / user)
- **Current value** — rendered differently by type:
  - Boolean: toggle switch (on/off)
  - Percentage: slider (0-100%) with numeric input
  - Plan: checkboxes (Free, Pro, Enterprise)
  - User: text area for UUID list
- **Description** (muted text)
- **Last updated** (relative timestamp)
- **Audit trail** link showing last 10 changes to this flag (who changed what, when)

### Toggle Behavior

When a flag is toggled:
1. GraphQL mutation `updateFeatureFlag(key, value, type)` called
2. PostgreSQL updated (source of truth)
3. Redis cache invalidated
4. Audit log entry created (`action: FEATURE_FLAG_CHANGE`)
5. Toast notification: "Flag `aiTutor` updated successfully"
6. Changes take effect immediately (next request reads from DB, caches in Redis)

### Page-Level Actions

- **"Add Flag"** button → modal form: key (unique), type selector, value input
- **"Bulk Update"** → select multiple flags, apply a plan gating change
- **"Reset to Defaults"** → confirmation modal, resets all flags to production defaults
- **Search** — filter flags by key or description

This admin console provides complete operational visibility and control over the UDB platform, enabling support staff, billing administrators, and SRE teams to manage tenants, users, subscriptions, and feature flags without direct database access.
