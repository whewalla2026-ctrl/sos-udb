# Admin Dashboard UI Specification

## 1. Layout

The admin dashboard reuses the existing dashboard shell (`apps/web/src/app/dashboard/layout.tsx`) with an admin-specific sidebar. The layout follows a three-region structure:

```
┌─────────────────────────────────────────────────┐
│  HEADER: UDB Admin  │  Search  │  Notif  │  👤  │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │                                      │
│          │           CONTENT AREA               │
│ Dashboard│                                      │
│ Tenants  │                                      │
│ Users    │                                      │
│ Billing  │                                      │
│ Health   │                                      │
│ Audit    │                                      │
│ Features │                                      │
│          │                                      │
│ Settings │                                      │
└──────────┴──────────────────────────────────────┘
```

### Sidebar

The admin sidebar replaces the user sidebar (`apps/web/src/components/Sidebar.tsx`) with admin-only navigation items. It uses the same glassmorphism styling (`var(--bg-glass)`) as the existing sidebar but with a distinct visual indicator (red accent line on the left edge) to differentiate it from the user dashboard.

**Nav items (top to bottom):**
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| 📊 | Dashboard | `/dashboard/admin` | Overview widgets and metrics |
| 🏢 | Tenants | `/dashboard/admin/tenants` | Tenant management |
| 👥 | Users | `/dashboard/admin/users` | User management |
| 💳 | Billing | `/dashboard/admin/billing` | Revenue and subscriptions |
| ❤️ | Health | `/dashboard/admin/health` | System health monitoring |
| 📋 | Audit Log | `/dashboard/admin/audit` | Audit log viewer |
| 🚩 | Features | `/dashboard/admin/features` | Feature flag management |

**Bottom section:**
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| ⚙️ | Settings | `/dashboard/admin/settings` | Admin preferences |
| 🔙 | Back to App | `/dashboard` | Switch to user dashboard |

**Active state:** The active route is highlighted with the primary gradient (`var(--gradient-primary)`) and a left border accent. Inactive items use `var(--text-muted)` color.

### Header

A sticky top bar (z-index 100) containing:
- **Breadcrumbs** — e.g., "Admin > Users > johndoe@example.com" with clickable segments
- **Global search** — a search input that searches across tenants, users, and audit logs (debounced, dropdown results with categories)
- **Notification bell** — icon showing unread admin alerts (system health warnings, payment failures, abuse flags)
- **Admin avatar** — dropdown menu with: "Admin Profile", "Settings", "Sign Out"

### Content Area

The remaining viewport area uses CSS Grid with `grid-template-columns: 260px 1fr`. The content area itself has `padding: 32px` and `overflow-y: auto`. Page content fills the available height with a minimum of `calc(100vh - 64px)`.

Responsive behavior: On screens < 1024px, the sidebar collapses to an icon-only rail (60px wide). On screens < 768px, the sidebar becomes a slide-out drawer triggered by a hamburger button.

## 2. Dashboard Widgets

The main admin dashboard (`/dashboard/admin`) displays four metric widgets in a 2x2 grid at the top, followed by charts and a recent activity feed.

### Widget Component Specification

Each widget is a `GlassCard` component using the existing glassmorphism tokens from the design system:

```css
/* CSS variables (from existing globals) */
--bg-glass: rgba(255, 255, 255, 0.05);
--bg-glass-border: rgba(255, 255, 255, 0.1);
--radius-md: 12px;
```

**Widget structure:**
```
┌──────────────────────────────┐
│ 🔢  Metric Value             │
│     Label                    │
│     ▲ +12.5% vs last period  │
└──────────────────────────────┘
```

**Padding:** `padding: 20px 24px`
**Border:** `1px solid var(--bg-glass-border)`
**Border radius:** `var(--radius-md)` (12px)
**Background:** `var(--bg-glass)`
**Backdrop filter:** `blur(12px)` for the glass effect
**Hover:** subtle transform `translateY(-2px)` with shadow transition (200ms ease)

### Widget 1: Total Users

```
📊 Total Users
  1,247
  ▲ +3.2% this week
```

- **Data source:** `query AdminDashboard { totalUsers }` → counts all `User` records
- **Refresh:** Every 60 seconds via `pollInterval: 60000`
- **Loading state:** Skeleton pulse animation (placeholder gray bars)
- **Error state:** "Unable to load metrics" with retry button

### Widget 2: Active Today

```
🟢 Active Today
  342
  ▼ -2.1% vs yesterday
```

- **Data source:** `query AdminDashboard { activeToday }` → counts users with `lastSeenAt > (now - 24h)`
- **Refresh:** Every 30 seconds
- **Color coding:** Green dot when active count > 10% of total users, yellow dot when > 5%, red dot when < 5%

### Widget 3: Revenue Today

```
💰 Revenue Today
  $1,429
  ▲ +8.7% vs yesterday
```

- **Data source:** Stripe webhook events aggregated for current day
- **Refresh:** Every 300 seconds
- **Format:** Locale-formatted USD with 2 decimal places
- **Tooltip:** Breakdown: "Pro subscriptions: $1,160 | Enterprise: $269"

### Widget 4: System Health

```
❤️ System Health
  Operational
  14/14 services healthy
```

- **Data source:** `GET /monitoring/signals` from monitoring service
- **Refresh:** Every 30 seconds
- **States:** "Operational" (green, all 14 signals healthy), "Degraded" (yellow, 1-3 signals degraded), "Down" (red, 4+ signals degraded or any critical signal down)
- **Tooltip:** Lists any degraded/down services with names

## 3. Charts

Three charts are rendered below the metric widgets using `recharts` (already a peer dependency in the project). Each chart sits inside a glassmorphism card with a title header.

### Chart 1: User Growth (Line Chart)

```
┌────────────────────────────────────────────┐
│ 📈 User Growth     [7D] [30D] [90D] [12M] │
│                                            │
│  1,500 ┤        ╱╲                         │
│  1,250 ┤     ╱╱  ╲╱╲                       │
│  1,000 ┤  ╱╱       ╲╱╲                     │
│    750 ┤ ╱           ╲╱                    │
│    500 ┤╱                                  │
│        └──────────────────────────────────  │
│          Jan  Feb  Mar  Apr  May  Jun       │
│  ─ Total Users  ─ New Users                │
└────────────────────────────────────────────┘
```

**Specification:**
- **Type:** `LineChart` with two series: "Total Users" (solid line, primary gradient) and "New Users" (dashed line, accent color)
- **X-axis:** Monthly buckets (7D/30D views use daily buckets)
- **Y-axis:** User count, auto-scaled
- **Time range selector:** Pill buttons in the header (7D / 30D / 90D / 12M), default: 30D
- **Tooltip:** Crosshair with value display on hover
- **Legend:** Bottom-left, clickable to toggle series visibility
- **Empty state:** "No data available" with line chart placeholder
- **Animation:** Line draws in on mount (500ms animation)

### Chart 2: Subscription Distribution (Pie Chart)

```
┌────────────────────────────────────────────┐
│ 💳 Subscription Distribution               │
│                                            │
│          ┌────────┐                        │
│         ╱  Free   ╲     Free: 748 (60%)   │
│        │   60%     │    Pro: 374 (30%)     │
│         ╲  ┌───┐  ╱    Enterprise: 125    │
│          └─│Pr │─┘           (10%)         │
│            │ o%│                           │
│            │10 │  Total: 1,247             │
│            └───┘   subscriptions           │
└────────────────────────────────────────────┘
```

**Specification:**
- **Type:** `PieChart` with `Cell` components
- **Segments:** Free (blue, `#4A90D9`), Pro (purple, `#9B59B6`), Enterprise (gold, `#F39C12`)
- **Center label:** "X total" subscription count
- **Hover:** Segment expands slightly (explode effect), shows tooltip with count and percentage
- **Click:** Navigates to `/dashboard/admin/tenants?plan=pro` (filtered tenant list)
- **Legend:** Right side, color dot + label + count + percentage
- **Data source:** `query AdminDashboard { subscriptionDistribution { plan count } }`

### Chart 3: Revenue (Bar Chart)

```
┌────────────────────────────────────────────┐
│ 💰 Revenue        [7D] [30D] [90D] [12M]  │
│                                            │
│  $5K ┤   ▓▓                                │
│  $4K ┤   ▓▓   ▓▓                           │
│  $3K ┤   ▓▓   ▓▓   ▓▓                      │
│  $2K ┤   ▓▓   ▓▓   ▓▓   ▓▓                 │
│  $1K ┤   ▓▓   ▓▓   ▓▓   ▓▓   ▓▓            │
│    0 └──────────────────────────────────    │
│       Jan  Feb  Mar  Apr  May  Jun          │
│  ██ Pro  ██ Enterprise                      │
└────────────────────────────────────────────┘
```

**Specification:**
- **Type:** `BarChart` with stacked bars (Pro revenue + Enterprise revenue)
- **X-axis:** Time buckets matching selected range
- **Y-axis:** Dollar amount, formatted as "$X,XXX"
- **Colors:** Pro = purple `#9B59B6`, Enterprise = gold `#F39C12`
- **Tooltip:** Stacked tooltip showing each segment's value + total for the period
- **Time range selector:** Same as user growth chart, synchronized
- **Reference line:** Dashed line at "Monthly Target" (configurable in admin settings)
- **Data source:** `query AdminDashboard { revenue(timeRange: $range) { month proAmount enterpriseAmount } }`

## 4. Data Tables

All admin data tables follow a consistent component pattern. The `AdminTable` component is a reusable, generic component with built-in search, filter, sort, and pagination.

### AdminTable Component

```tsx
<AdminTable
  columns={[
    { key: 'email', label: 'Email', sortable: true, filterable: true },
    { key: 'role', label: 'Role', sortable: true, filterable: true, 
      render: (val) => <RoleBadge role={val} /> },
    { key: 'plan', label: 'Plan', sortable: true },
    { key: 'lastSeen', label: 'Last Seen', sortable: true,
      render: (val) => <RelativeTime date={val} /> },
  ]}
  data={users}
  loading={loading}
  onSort={(key, dir) => ...}
  onFilter={(filters) => ...}
  page={page}
  pageSize={25}
  total={totalCount}
  onPageChange={setPage}
/>
```

**Features:**
- **Sticky header** — column headers remain fixed during vertical scroll
- **Row hover** — subtle background color change on hover
- **Row click** — navigates to detail view (configurable link)
- **Checkbox column** — optional first column for bulk selection
- **Empty state** — magazine-style empty illustration with "No results found" message
- **Loading state** — 5 skeleton rows that pulse
- **Error state** — "Failed to load data" with retry button

### Search

- **Debounced input** — 300ms delay before sending GraphQL query
- **Search icon** — left-aligned magnifying glass
- **Clear button** — right-aligned X when input has value
- **Placeholder** — contextual (e.g., "Search by email, name, or ID...")
- **Results count** — "Showing 25 of 1,247 results" below search bar

### Filter

- **Filter button** — gear icon, opens a dropdown panel
- **Filter types:**
  - Text input (for partial match)
  - Multi-select checkboxes (for enums like role, plan, status)
  - Date range picker (for timestamps)
  - Number range (for metrics)
- **Active filters** displayed as removable chips below search bar
- **Clear all** button to reset all filters

### Sort

- Click column header to sort ascending → click again for descending → click again to remove sort
- Active sort indicator: arrow up (asc) or arrow down (desc) next to column label
- Only one column sorted at a time (single-column sort)

### Pagination

```
[< Prev]  1  2  3 ... 47  48  [Next >]  25 per page ▼
```

- **Page buttons:** Current page highlighted, surrounding pages visible, ellipsis for large gaps
- **Per-page selector:** 25 / 50 / 100 options
- **Total info:** "Showing 1-25 of 1,247 results" on the right
- **Keyboard navigation:** Left/right arrow keys to change page when table is focused

## 5. Color Scheme and Styling

### Dark Theme Consistency

The admin dashboard uses the same dark theme tokens as the existing UDB dashboard. No new theme variables are introduced — the admin UI reuses the existing design system defined in the CSS globals.

**Core tokens:**
```css
--bg-primary: #0a0a0f;
--bg-secondary: #12121a;
--bg-glass: rgba(255, 255, 255, 0.05);
--bg-glass-hover: rgba(255, 255, 255, 0.08);
--bg-glass-border: rgba(255, 255, 255, 0.1);
--gradient-primary: linear-gradient(135deg, #6C63FF, #FF6B9D);
--text-primary: #ffffff;
--text-secondary: #e0e0e0;
--text-muted: #8888aa;
--color-success: #4CAF50;
--color-warning: #FF9800;
--color-danger: #f44336;
--color-info: #2196F3;
--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 16px;
```

### Glassmorphism Cards

All dashboard widgets, charts, and panel containers use glassmorphism:
```
background: var(--bg-glass);
border: 1px solid var(--bg-glass-border);
border-radius: var(--radius-md);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

**Hover effect** (on interactive cards):
```
transform: translateY(-2px);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
transition: all 200ms ease;
```

### Status Badges

| Status | Background Color | Text Color | Example |
|--------|-----------------|------------|---------|
| Healthy/Active | `rgba(76, 175, 80, 0.15)` | `#4CAF50` | Green pill |
| Degraded/Warning | `rgba(255, 152, 0, 0.15)` | `#FF9800` | Yellow pill |
| Down/Suspended | `rgba(244, 67, 54, 0.15)` | `#f44336` | Red pill |
| Free plan | `rgba(74, 144, 217, 0.15)` | `#4A90D9` | Blue pill |
| Pro plan | `rgba(155, 89, 182, 0.15)` | `#9B59B6` | Purple pill |
| Enterprise plan | `rgba(243, 156, 18, 0.15)` | `#F39C12` | Gold pill |

Badge CSS: `padding: 2px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600;`

### Typography

- **Font:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- **Headings:** `h1` = 1.75rem/700, `h2` = 1.25rem/600, `h3` = 1rem/600
- **Body:** 0.875rem/400
- **Metrics (widget numbers):** 2rem/700 with monospace digits
- **Table cells:** 0.8125rem/400
- **Code/JSON:** `'SF Mono', 'Fira Code', monospace` at 0.8125rem

### Spacing

- **Page padding:** 32px
- **Widget gap:** 24px (CSS Grid `gap`)
- **Card padding:** 20px 24px
- **Table cell padding:** 12px 16px
- **Section spacing:** 32px between sections

### Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| > 1440px | 4-column chart grid, full sidebar |
| 1024-1440px | 2-column chart grid, full sidebar |
| 768-1024px | 2-column chart grid, collapsed sidebar (icon rail) |
| < 768px | Single column, slide-out sidebar drawer |

The admin dashboard UI is designed to feel like a natural extension of the existing UDB dashboard — same visual language, same component patterns, same dark glassmorphism aesthetic — while providing the operational tooling needed for platform administration.
