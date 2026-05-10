# UDB Platform — Comprehensive API Reference

> **Version:** 3.0 (Phase 3)  
> **GraphQL Endpoint:** `http://<host>:4000/graphql`  
> **REST Gateway:** `http://<host>:3000`  
> **Auth Service:** `http://<host>:3001` (internal)  
> **Database:** PostgreSQL via Prisma ORM

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [GraphQL API](#2-graphql-api)
   - [2.1 Queries](#21-queries)
   - [2.2 Mutations](#22-mutations)
   - [2.3 Types & Enums](#23-types--enums)
3. [REST Endpoints (API Gateway)](#3-rest-endpoints-api-gateway)
   - [3.1 Auth Routes (Unauthenticated)](#31-auth-routes-unauthenticated)
   - [3.2 Auth Routes (Authenticated)](#32-auth-routes-authenticated)
   - [3.3 Planner Routes](#33-planner-routes)
   - [3.4 AI Routes](#34-ai-routes)
   - [3.5 Monitoring Routes](#35-monitoring-routes)
   - [3.6 Audit Routes](#36-audit-routes)
   - [3.7 Gateway Operations](#37-gateway-operations)
4. [Error Codes](#4-error-codes)
5. [Rate Limiting & Circuit Breakers](#5-rate-limiting--circuit-breakers)

---

## 1. Authentication & Authorization

### 1.1 JWT Token Format

The platform uses self-contained HMAC-SHA256 JWT tokens (no external library dependency). Tokens are composed of three base64url-encoded segments separated by dots:

```
<header>.<payload>.<signature>
```

**Header:**
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload fields:**
| Field | Type | Description |
|-------|------|-------------|
| `userId` | `String` | UUID of the authenticated user |
| `email` | `String` | User email address |
| `role` | `String` | One of `CHILD`, `PARENT`, `ADMIN` |
| `sub` | `String` | Subject (same as `userId`) |
| `jti` | `String` | Unique token ID (UUID v4) |
| `iat` | `Number` | Issued-at timestamp (seconds since epoch) |
| `exp` | `Number` | Expiration timestamp (seconds since epoch) |
| `type` | `String` | Optional; `"refresh"` for refresh tokens |

**Token lifetimes (configurable via environment):**
- **Access token:** 300 seconds (5 minutes) by default — `JWT_EXPIRY_SECONDS`
- **Refresh token:** 86400 seconds (24 hours) by default — `REFRESH_EXPIRY_SECONDS`

### 1.2 Token Validation

```http
Authorization: Bearer <token>
```

Validation is performed by the gateway middleware (`shared/security.js:verifyToken`):
1. Token is checked against the Redis blacklist (revoked tokens).
2. HMAC-SHA256 signature is verified using the server secret (`JWT_SECRET`).
3. Expiration claim (`exp`) is checked against current time.
4. On failure, returns `401 Unauthorized` with `{"error": "Invalid or expired token"}`.

### 1.3 Firebase Auth Integration

The `loginWithFirebase` mutation accepts a Firebase ID token and a requested role:

```
mutation { loginWithFirebase(idToken: String!, role: UserRole! = PARENT): AuthPayload! }
```

The Firebase token is verified server-side; if valid, the user is looked up or created in the PostgreSQL database. The response contains a platform JWT (`accessToken`) that must be used for all subsequent API calls.

### 1.4 Refresh Token Rotation

Refresh tokens (24-hour lifetime) are issued alongside access tokens. The `POST /auth/refresh` endpoint accepts a valid refresh token and returns a new access token + new refresh token pair. Old refresh tokens are invalidated after use (rotation).

### 1.5 RBAC — Role-Based Access Control

Three roles are defined, arranged in a hierarchy:

| Role | Hierarchy Level | Description |
|------|----------------|-------------|
| `CHILD` | 1 | End-user (student/child). Can manage their own goals, Doter, quests, ledger, messages, ventures, biometrics. |
| `PARENT` | 2 | Parent/guardian. Has `CHILD` permissions plus can link children, manage family settings, approve ventures, release escrow funds. |
| `ADMIN` | 4 | System administrator. Has all permissions plus access to audit logs, circuit breaker management, and all user data. |

**Enforcement:** The gateway middleware enforces access via `hasRole(userRole, requiredRole)` which compares hierarchy levels. Certain routes (e.g., audit log) require the `ADMIN` role explicitly.

### 1.6 Cross-Tenant Isolation

The `enforceTenantAccess` middleware prevents users from accessing other users' data by comparing `req.params.userId` against `req.user.userId`. Violations return `403 Forbidden` with `{"error": "Cross-tenant access denied"}`.

---

## 2. GraphQL API

**Endpoint:** `POST /graphql` (NestJS, port 4000)  
**Content-Type:** `application/json`  
**Authentication:** Required for all queries and mutations (JWT via `Authorization` header)

All GraphQL operations require the `Authorization: Bearer <token>` header. Token is validated by the NestJS GraphQL gateway before resolver execution.

### 2.1 Queries

---

#### `me`

Returns the authenticated user's profile including their Doter avatar.

```graphql
me: UserType!
```

**Authentication:** Required  
**Example:**
```graphql
query GetMe {
  me {
    id
    displayName
    email
    role
    avatarUrl
    doterProfile {
      id
      name
      state
      level
      xp
      coinBalance
      streakDays
      isEnergetic
      isSluggy
    }
  }
}
```

**Response type:** [`UserType`](#usertype)

---

#### `dashboardData`

Returns aggregated data for the user's dashboard — a JSON blob combining goals, Doter state, skill gaps, safety score, weekly plan, and unread notifications.

```graphql
dashboardData: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Arbitrary JSON object (see `GET_DASHBOARD_DATA` query in the frontend which requests `dashboardData`, `myDoter`, `myGoals`, `mySkillGaps`, `mySafetyScore`, `myWeeklyPlan`, and `unreadNotifications` in a single operation).

---

#### `myDoter`

Returns the authenticated user's Doter (gamified avatar) profile.

```graphql
myDoter: JSON
```

**Authentication:** Required  
**Arguments:** None  
**Response:** JSON object with fields matching [`DoterProfileType`](#doterprofiletype). Returns `null` if no Doter profile exists.

---

#### `myGoals`

Returns the user's goals across all pillars.

```graphql
myGoals: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of goal objects. Each goal contains: `id`, `title`, `pillar`, `status` (ACTIVE | COMPLETED | PAUSED | ARCHIVED), `targetWeight`, `currentWeight`, `dueDate`, `createdAt`, `certificateUrl`.

---

#### `myChildren`

Returns the list of children linked to the authenticated parent's account. Only valid for `PARENT` role users.

```graphql
myChildren: [UserType!]!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of [`UserType`](#usertype) objects.  
**Example:**
```graphql
query GetMyChildren {
  myChildren {
    id
    displayName
    avatarUrl
    role
  }
}
```

---

#### `myFamily`

Returns the full family tree for the authenticated user — parents and children.

```graphql
myFamily: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** JSON object containing family relationships (parents linked via `FamilyLink` table).

---

#### `myBalance`

Returns the user's current coin balance (sum of all settled ledger entries).

```graphql
myBalance: Int!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Integer representing the current coin balance.  
**Example:**
```graphql
query GetBalance {
  myBalance
}
```

---

#### `myLedger`

Returns a paginated list of the user's financial ledger entries.

```graphql
myLedger(page: Int! = 1, pageSize: Int! = 20): LedgerPage!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `page` | `Int!` | `1` | Page number (1-indexed) |
| `pageSize` | `Int!` | `20` | Number of entries per page |

**Example:**
```graphql
query GetLedger($page: Int, $pageSize: Int) {
  myLedger(page: $page, pageSize: $pageSize) {
    entries {
      id
      amount
      balanceAfter
      description
      source
      status
      transactionType
      createdAt
    }
    total
    page
    pageSize
  }
}
```

**Response type:** [`LedgerPage`](#ledgerpage)

---

#### `myWeeklyPlan`

Returns the user's current weekly plan (AI-generated or finalized).

```graphql
myWeeklyPlan: JSON
```

**Authentication:** Required  
**Arguments:** None  
**Response:** JSON object or `null`. Contains `aiDraft` (AI-suggested activities), `finalPlan` (user-confirmed activities), `focusPillars`, `isFinalized`, `weekStart`, `weekEnd`.

---

#### `mySafetyScore`

Returns the user's current safety score (0–100).

```graphql
mySafetyScore: JSON
```

**Authentication:** Required  
**Arguments:** None  
**Response:** JSON object with `score` (float), `components` (sub-scores for messaging, content, social), `alerts` (active safety alerts), `recordedAt`. Returns `null` if no score exists.

---

#### `mySkillGaps`

Returns the user's skill gap assessments across subjects.

```graphql
mySkillGaps: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of skill gap objects. Each contains: `id`, `subject`, `pillar`, `gapScore` (0.0 = critical, 1.0 = mastered), `lastPracticed`, `ritScore`.

---

#### `myVentures`

Returns the user's entrepreneurial ventures (Kid-Preneur).

```graphql
myVentures: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of venture objects. Each contains: `id`, `name`, `status` (DRAFT | ACTIVE | PAUSED | COMPLETED), `problem`, `solution`, `targetMarket`, `pricingModel`, `totalRevenue`, `parentApproved`.

---

#### `evidenceGallery`

Returns the user's uploaded evidence items (proof of work for quests).

```graphql
evidenceGallery: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of evidence objects. Each contains: `id`, `title`, `type` (IMAGE | VIDEO | TEXT | DOCUMENT), `url`, `thumbnailUrl`, `questId`, `aiProTip`, `createdAt`.

---

#### `biometricHistory`

Returns the user's biometric log entries over a configurable time window.

```graphql
biometricHistory(days: Float! = 30): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `days` | `Float!` | `30` | Number of days of history to return |

**Response:** Array of biometric log objects. Each contains: `id`, `loggedAt`, `sleepHours`, `hrv`, `stressLevel`, `focusScore`, `heartRate`, `steps`, `source`.

---

#### `auditLog`

Returns system audit log entries (ADMIN only).

```graphql
auditLog(limit: Int! = 50): JSON!
```

**Authentication:** Required (ADMIN role)  
**Arguments:**

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `limit` | `Int!` | `50` | Maximum number of entries to return |

**Response:** Array of audit log objects. Each contains: `id`, `actorId`, `action`, `targetType`, `targetId`, `payload`, `ipAddress`, `userAgent`, `createdAt`.

---

#### `inbox`

Returns the user's message inbox (received messages).

```graphql
inbox: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of message objects. Each contains: `id`, `senderId`, `receiverId`, `content`, `status` (SENT | DELIVERED | READ), `isSafe`, `isAiMessage`, `createdAt`, `readAt`.

---

#### `conversation`

Returns the full message thread between the authenticated user and another user.

```graphql
conversation(withUserId: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `withUserId` | `String!` | UUID of the other conversation participant |

**Response:** Array of message objects sorted chronologically.

---

#### `marketplaceItems`

Returns the list of items available in the marketplace for purchase with coins.

```graphql
marketplaceItems: [MarketplaceItem!]!
```

**Authentication:** Required  
**Arguments:** None  
**Example:**
```graphql
query MarketplaceItems {
  marketplaceItems {
    id
    name
    description
    cost
    category
    icon
  }
}
```

**Response type:** [`[MarketplaceItem!]!`](#marketplaceitem)

---

#### `futureSelfNarrative`

Returns an AI-generated narrative about the user's future self based on their goals and progress.

```graphql
futureSelfNarrative: String!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** A string containing the AI-generated narrative.

---

#### `coachingInsight`

Returns a real-time AI coaching insight or Socratic prompt for the user.

```graphql
coachingInsight: String!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** A string containing the coaching insight or question.

---

#### `focusPeak`

Returns the user's optimal focus time windows based on biometric and activity data.

```graphql
focusPeak: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** JSON object identifying peak focus periods.

---

#### `unreadNotifications`

Returns the user's unread notifications.

```graphql
unreadNotifications: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Response:** Array of notification objects. Each contains: `id`, `type` (e.g., LOW_SLEEP_ALERT, QUEST_COMPLETE, SKILL_GAP, SAFETY_ALERT), `title`, `body`, `data`, `isRead`, `createdAt`.

---

#### `goalProgress`

Returns progress data for a specific goal.

```graphql
goalProgress(goalId: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `goalId` | `String!` | UUID of the goal |

**Response:** JSON object with `currentWeight`, `targetWeight`, `status`, and related quest completions.

---

#### `myCalendar`

Returns the user's calendar activities within a date range.

```graphql
myCalendar(from: String!, to: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `from` | `String!` | Start date (ISO 8601 string) |
| `to` | `String!` | End date (ISO 8601 string) |

**Response:** Array of activity objects. Each contains: `id`, `title`, `description`, `pillar`, `status`, `startTime`, `endTime`, `isDeepWork`, `isRecurring`, `rrule`.

---

### 2.2 Mutations

---

#### `loginWithFirebase`

Authenticates a user via Firebase ID token. Creates a new user account if none exists for the Firebase UID.

```graphql
loginWithFirebase(idToken: String!, role: UserRole! = PARENT): AuthPayload!
```

**Authentication:** None (public)  
**Arguments:**

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `idToken` | `String!` | — | Firebase ID token obtained from Firebase Auth client SDK |
| `role` | `UserRole!` | `PARENT` | Requested role for new account creation |

**Returns:** [`AuthPayload`](#authpayload) containing `accessToken`, `email`, `role`, `userId`.

---

#### `updateProfile`

Updates the authenticated user's profile fields.

```graphql
updateProfile(data: UpdateProfileInput!): UserType!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `data` | `UpdateProfileInput!` | Object with optional fields: `displayName`, `avatarUrl`, `timezone` |

**Example:**
```graphql
mutation UpdateProfile($data: UpdateProfileInput!) {
  updateProfile(data: $data) {
    id
    displayName
    avatarUrl
  }
}
```

**Returns:** [`UserType`](#usertype)

---

#### `linkChild`

Links a child account to the authenticated parent's account.

```graphql
linkChild(childId: String!, consentMethod: String!): JSON!
```

**Authentication:** Required (PARENT role)  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `childId` | `String!` | UUID of the child user to link |
| `consentMethod` | `String!` | Method of parental consent (`CREDIT_CARD`, `ID_CHECK`) |

**Returns:** JSON confirmation object. Creates a `FamilyLink` record in the database.

---

#### `nameMyDoter`

Sets or updates the name of the authenticated user's Doter avatar.

```graphql
nameMyDoter(name: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | New name for the Doter |

**Returns:** JSON confirmation object.

---

#### `addDoterXP`

Adds experience points to the user's Doter avatar. May trigger level-up and evolution.

```graphql
addDoterXP(xp: Int!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `xp` | `Int!` | Number of XP to award (must be positive) |

**Returns:** JSON object with updated `xp`, `level`, `state`, and any evolution/buff/debuff changes.

---

#### `createGoal`

Creates a new goal for the authenticated user.

```graphql
createGoal(pillar: String!, title: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `pillar` | `String!` | Pillar name: `ACADEMIC`, `BIOMETRIC`, `GAMIFICATION`, `ENTREPRENEURSHIP`, `SOCIAL`, `LIFE_SKILLS` |
| `title` | `String!` | Goal title |

**Returns:** JSON object with the created goal's `id`, `title`, `pillar`, `status` (initial: `ACTIVE`).

---

#### `createActivity`

Creates a new calendar activity for the user.

```graphql
createActivity(endTime: String!, pillar: String, startTime: String!, title: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `title` | `String!` | Activity title |
| `startTime` | `String!` | Start time (ISO 8601) |
| `endTime` | `String!` | End time (ISO 8601) |
| `pillar` | `String` | Optional pillar classification |

**Returns:** JSON object with the created activity's `id`, `title`, `startTime`, `endTime`, `status`.

---

#### `logBiometric`

Logs a biometric data point for the authenticated user.

```graphql
logBiometric(data: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `data` | `String!` | JSON string containing biometric fields: `sleepHours`, `hrv`, `stressLevel`, `focusScore`, `heartRate`, `steps`, `source` |

**Returns:** JSON confirmation object with the created `BiometricLog` entry.

---

#### `askTutor`

Sends a message to the AI Socratic tutor and receives a guided response.

```graphql
askTutor(input: String!, sessionId: String!, subject: String!): SocraticResponse!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `input` | `String!` | The user's question or statement |
| `sessionId` | `String!` | Tutoring session UUID (use `startTutoringSession` to create) |
| `subject` | `String!` | Academic subject (e.g., `MATH`, `SCIENCE`, `ELA`) |

**Example:**
```graphql
mutation AskTutor($input: String!, $sessionId: String!, $subject: String!) {
  askTutor(input: $input, sessionId: $sessionId, subject: $subject) {
    response
    intent
  }
}
```

**Returns:** [`SocraticResponse`](#socraticresponse) with `response` (the tutor's reply) and `intent` (classified intent of the query).

---

#### `startTutoringSession`

Initiates a new AI tutoring session for the specified subject.

```graphql
startTutoringSession(subject: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `subject` | `String!` | Academic subject for the session |

**Returns:** JSON object with the created `TutoringSession` `id`, `subject`, `createdAt`. This `id` should be passed as `sessionId` to `askTutor`.

---

#### `generateWeeklyPlan`

Triggers AI generation of a weekly plan based on the user's goals, skill gaps, and calendar.

```graphql
generateWeeklyPlan: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Returns:** JSON object containing the AI-generated `WeeklyPlan` with `aiDraft` (array of suggested activities).

---

#### `addEvidence`

Uploads an evidence item (proof of work) for a quest or general portfolio.

```graphql
addEvidence(questId: String, title: String!, type: String!, url: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `questId` | `String` | Optional UUID of the associated quest |
| `title` | `String!` | Title/description of the evidence |
| `type` | `String!` | Media type: `IMAGE`, `VIDEO`, `TEXT`, `DOCUMENT` |
| `url` | `String!` | URL to the evidence file (stored in cloud storage) |

**Returns:** JSON confirmation object with the created `EvidenceItem` `id`.

---

#### `sendMessage`

Sends a message to another user (parent-to-child, child-to-parent, or AI Life Coach).

```graphql
sendMessage(content: String!, receiverId: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `content` | `String!` | Message body text |
| `receiverId` | `String!` | UUID of the recipient user |

**Returns:** JSON object with the created `Message` `id`, `status` (initial: `SENT`).

---

#### `markNotificationRead`

Marks a single notification as read.

```graphql
markNotificationRead(id: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `id` | `String!` | UUID of the notification to mark |

**Returns:** JSON confirmation object.

---

#### `markAllRead`

Marks all unread notifications for the authenticated user as read.

```graphql
markAllRead: JSON!
```

**Authentication:** Required  
**Arguments:** None  
**Returns:** JSON confirmation object with the count of notifications updated.

---

#### `createVenture`

Creates a new Kid-Preneur venture (business).

```graphql
createVenture(name: String!, pricingModel: String!, problem: String!, solution: String!, targetMarket: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `name` | `String!` | Venture/business name |
| `problem` | `String!` | Problem being solved |
| `solution` | `String!` | Proposed solution |
| `targetMarket` | `String!` | Target customer segment |
| `pricingModel` | `String!` | Pricing strategy |

**Returns:** JSON object with the created `Venture` `id`, `name`, `status` (initial: `DRAFT`).

---

#### `generateBusinessPlan`

Uses AI to generate a structured business plan for an existing venture.

```graphql
generateBusinessPlan(data: BusinessPlanInput!): BusinessPlanResponse!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `data` | `BusinessPlanInput!` | Object with `founderAge`, `pricingModel`, `problem`, `solution`, `targetMarket` |

**Returns:** [`BusinessPlanResponse`](#businessplanresponse) containing `executiveSummary`, `isValid` (viability assessment), `validationNotes`.

---

#### `releaseFunds`

Releases escrow funds for a completed venture transaction (parent approval).

```graphql
releaseFunds(escrowId: String!): JSON!
```

**Authentication:** Required (PARENT or ADMIN role)  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `escrowId` | `String!` | UUID of the escrow hold to release |

**Returns:** JSON confirmation object updating `Escrow` status from `HELD` to `RELEASED`.

---

#### `updateSkillGap`

Updates or creates a skill gap assessment for a subject.

```graphql
updateSkillGap(gapScore: Float!, subject: String!): JSON!
```

**Authentication:** Required  
**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `subject` | `String!` | Subject identifier (e.g., `MATH`, `READING`) |
| `gapScore` | `Float!` | Mastery score: 0.0 (critical gap) to 1.0 (mastered) |

**Returns:** JSON confirmation object with the upserted `SkillGap` entry.

---

### 2.3 Types & Enums

#### `AuthPayload`

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | `String!` | JWT access token for subsequent API calls |
| `email` | `String!` | Authenticated user's email |
| `role` | `UserRole!` | Assigned role: `ADMIN`, `CHILD`, or `PARENT` |
| `userId` | `String!` | User UUID |

#### `UserType`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String!` | UUID |
| `email` | `String!` | Email address |
| `displayName` | `String?` | Display name |
| `avatarUrl` | `String?` | Avatar image URL |
| `role` | `String!` | Role string (`CHILD`, `PARENT`, `ADMIN`) |
| `createdAt` | `DateTime!` | Account creation timestamp |
| `accessibilitySettings` | `JSON!` | Accessibility preferences |
| `uupData` | `JSON` | Unified User Profile JSONB data |
| `doterProfile` | `DoterProfileType` | Associated Doter avatar (nullable) |

#### `DoterProfileType`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String!` | UUID |
| `name` | `String!` | Doter name (default: "My Doter") |
| `state` | `String!` | Evolution state: `EGG`, `HATCHLING`, `JUVENILE`, `ADOLESCENT`, `ADULT`, `LEGENDARY` |
| `level` | `Float!` | Current level (starts at 1) |
| `xp` | `Float!` | Experience points |
| `coinBalance` | `Float!` | Current coin balance |
| `streakDays` | `Float!` | Current streak length |
| `isEnergetic` | `Boolean!` | True if activity completed today (buff active) |
| `isSluggy` | `Boolean!` | True if sleep < 6 hours (debuff active) |

#### `LedgerEntry`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String!` | UUID |
| `amount` | `Int!` | Transaction amount (can be negative) |
| `balanceAfter` | `Int!` | Balance after transaction |
| `description` | `String` | Human-readable description |
| `source` | `String!` | Source category: `QUEST`, `MANUAL_AWARD`, `ESCROW`, `PURCHASE`, `BONUS`, `STREAK_REWARD` |
| `status` | `String!` | Settlement status: `PENDING`, `SETTLED`, `REVERSED` |
| `transactionType` | `String!` | Type: `EARN`, `SPEND`, `REVERSE`, `ESCROW_HOLD`, `ESCROW_RELEASE` |
| `createdAt` | `DateTime!` | Transaction timestamp |

#### `LedgerPage`

| Field | Type | Description |
|-------|------|-------------|
| `entries` | `[LedgerEntry!]!` | Array of ledger entries for the current page |
| `page` | `Int!` | Current page number |
| `pageSize` | `Int!` | Entries per page |
| `total` | `Int!` | Total number of entries across all pages |

#### `MarketplaceItem`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String!` | UUID |
| `name` | `String!` | Item name |
| `description` | `String` | Item description |
| `cost` | `Float!` | Purchase price in coins |
| `category` | `String!` | Item category |
| `icon` | `String!` | Icon identifier or URL |

#### `SocraticResponse`

| Field | Type | Description |
|-------|------|-------------|
| `response` | `String!` | AI tutor's Socratic response text |
| `intent` | `String!` | Classified intent of the user's query (e.g., `QUESTION`, `EXPLANATION`, `PRACTICE`) |

#### `BusinessPlanResponse`

| Field | Type | Description |
|-------|------|-------------|
| `executiveSummary` | `String!` | AI-generated executive summary of the business plan |
| `isValid` | `Boolean!` | Whether the plan passes AI validation checks |
| `validationNotes` | `String!` | Feedback and suggestions for improvement |

#### `UpdateProfileInput`

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | `String` | New display name |
| `avatarUrl` | `String` | New avatar URL |
| `timezone` | `String` | IANA timezone string (e.g., `America/New_York`) |

#### `BusinessPlanInput`

| Field | Type | Description |
|-------|------|-------------|
| `founderAge` | `Float!` | Age of the venture founder |
| `pricingModel` | `String!` | Pricing strategy description |
| `problem` | `String!` | Problem being addressed |
| `solution` | `String!` | Proposed solution |
| `targetMarket` | `String!` | Target market description |

#### `UserRole` (Enum)

| Value | Description |
|-------|-------------|
| `ADMIN` | System administrator — full access including audit logs |
| `CHILD` | Child/student user — personal goals, Doter, quests, ledger |
| `PARENT` | Parent/guardian — family management, escrow release, child oversight |

#### `DateTime` (Scalar)

ISO 8601 date-time string in UTC, e.g., `2019-12-03T09:54:33Z`.

#### `JSON` (Scalar)

Arbitrary JSON value as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).

---

## 3. REST Endpoints (API Gateway)

**Base URL:** `http://<host>:3000`  
**Content-Type:** `application/json` (all requests/responses)  
**Gateway Port:** 3000 (configurable via `GATEWAY_PORT`)

The API Gateway (`gateway.js`) proxies requests to four internal microservices:

| Service | Host | Port | Routes |
|---------|------|------|--------|
| **Auth** | `localhost` | 3001 | `/auth/*`, `/auth/health` |
| **Planner** | `localhost` | 3002 | `/planning/*`, `/planner/health` |
| **AI** | `localhost` | 3003 | `/ai-lite/*`, `/ai/health` |
| **Monitoring** | `localhost` | 3004 | `/monitoring/*`, `/audit/*` |

All service host/port values are configurable via environment variables (`AUTH_SERVICE_HOST`, `AUTH_SERVICE_PORT`, etc.).

### 3.1 Auth Routes (Unauthenticated)

These routes do not require an `Authorization` header. Brute-force protection (Redis-backed) is applied to registration and login.

---

#### `POST /auth/register`

Creates a new user account.

**Authentication:** None  
**Rate Limited:** Yes (global rate limiter: 200 req/min)  
**Brute Force Protection:** Yes  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "Alex",
  "role": "PARENT"
}
```
**Response (201):**
```json
{
  "userId": "uuid-string",
  "email": "user@example.com",
  "role": "PARENT",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Error Codes:** `400` (validation), `409` (email exists), `429` (rate limit)

---

#### `POST /auth/login`

Authenticates with email and password, returns JWT tokens.

**Authentication:** None  
**Rate Limited:** Yes (200 req/min)  
**Brute Force Protection:** Yes  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid-string",
  "role": "PARENT"
}
```
**Error Codes:** `401` (invalid credentials), `429` (rate limit / brute force)

---

#### `POST /auth/refresh`

Exchanges a refresh token for a new access token + refresh token pair (rotation).

**Authentication:** None (uses refresh token in body)  
**Rate Limited:** Yes (200 req/min)  
**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Response (200):**
```json
{
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "expiresIn": 300
}
```
**Error Codes:** `401` (invalid/expired/revoked refresh token)

---

#### `POST /auth/forgot-password`

Initiates a password reset flow. Sends a reset link to the user's email.

**Authentication:** None  
**Rate Limited:** Yes (200 req/min)  
**Request Body:**
```json
{
  "email": "user@example.com"
}
```
**Response (200):** Always returns success to prevent email enumeration.
```json
{
  "message": "If the email exists, a reset link has been sent."
}
```

---

#### `POST /auth/reset-password`

Completes the password reset flow using a reset token from email.

**Authentication:** None  
**Rate Limited:** Yes (200 req/min)  
**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword456"
}
```
**Response (200):**
```json
{
  "message": "Password has been reset successfully."
}
```

---

#### `POST /auth/change-password`

Changes the password for an authenticated user.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (200 req/min)  
**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```
**Response (200):**
```json
{
  "message": "Password changed successfully."
}
```
**Error Codes:** `401` (invalid current password)

---

#### `POST /auth/validate`

Validates an access token and returns its decoded payload.

**Authentication:** None (token in request body)  
**Rate Limited:** Yes (200 req/min)  
**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
**Response (200):**
```json
{
  "valid": true,
  "payload": {
    "userId": "uuid-string",
    "email": "user@example.com",
    "role": "PARENT",
    "iat": 1680000000,
    "exp": 1680000300
  }
}
```
**Error Codes:** `401` (invalid/expired/blacklisted token)

---

### 3.2 Auth Routes (Authenticated)

---

#### `GET /auth/me`

Returns the authenticated user's token payload (decoded JWT claims).

**Authentication:** Required (Bearer token)  
**Headers:** `Authorization: Bearer <token>`  
**Response (200):**
```json
{
  "userId": "uuid-string",
  "email": "user@example.com",
  "role": "PARENT",
  "iat": 1680000000,
  "exp": 1680000300
}
```

---

### 3.3 Planner Routes

These routes are proxied to the Planner microservice (port 3002). All require authentication and have an API-level rate limit of 100 req/min.

---

#### `POST /planning/generate`

Triggers AI generation of a weekly plan or schedule for the authenticated user.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Request Body:** Service-specific JSON payload  
**Response:** Service-specific JSON (the weekly plan draft)

---

#### `POST /planning/update`

Updates an existing plan (e.g., user modifies AI-generated schedule).

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Request Body:** Service-specific JSON payload  
**Response:** Service-specific JSON

---

#### `GET /planning/:userId`

Retrieves the current plan for a specific user. Enforces cross-tenant isolation: the `:userId` parameter must match the authenticated user's ID.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Path Parameters:** `:userId` — UUID of the user  
**Response:** Service-specific JSON (the user's plan)

---

### 3.4 AI Routes

Proxied to the AI microservice (port 3003). All require authentication and have a 100 req/min rate limit.

---

#### `POST /ai-lite/hint`

Requests a hint from the AI for a specific problem or question.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Request Body:** Service-specific JSON (problem context)  
**Response:** Service-specific JSON (hint text)

---

#### `POST /ai-lite/batch`

Processes a batch of AI requests (e.g., bulk hint generation, content analysis).

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Request Body:** Service-specific JSON array of requests  
**Response:** Service-specific JSON array of responses

---

#### `GET /ai-lite/budget/:userId`

Retrieves the AI usage budget for a specific user. Enforces cross-tenant isolation.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Path Parameters:** `:userId` — UUID of the user  
**Response:** Service-specific JSON (budget remaining, tokens used, etc.)

---

### 3.5 Monitoring Routes

Proxied to the Monitoring microservice (port 3004). Health endpoint is public; all others require authentication and are rate-limited.

---

#### `GET /monitoring/health`

Returns the health status of the Monitoring service.

**Authentication:** None  
**Response (200):**
```json
{
  "service": "monitoring-service",
  "status": "healthy",
  "uptime": 12345.67
}
```

---

#### `GET /monitoring/signals`

Returns current monitoring signals/alerts for the authenticated user.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Response:** Array of signal objects

---

#### `POST /monitoring/alerts`

Creates a new alert in the monitoring system.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Request Body:** Service-specific JSON  
**Response:** Service-specific JSON

---

#### `GET /monitoring/alerts`

Retrieves active alerts.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Response:** Array of alert objects

---

#### `GET /monitoring/events`

Retrieves system events from the monitoring service.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Response:** Array of event objects

---

#### `POST /monitoring/signal`

Posts a monitoring signal data point.

**Authentication:** Required (Bearer token)  
**Rate Limited:** Yes (100 req/min)  
**Request Body:** Service-specific JSON  
**Response:** Service-specific JSON

---

### 3.6 Audit Routes

---

#### `GET /audit/log`

Retrieves the system audit log. **ADMIN role required.**

**Authentication:** Required (Bearer token)  
**Role Required:** `ADMIN`  
**Rate Limited:** Yes (100 req/min)  
**Headers:** `Authorization: Bearer <token>`  
**Response:** Array of audit log entries (WORM — Write Once Read Many). Each entry includes `id`, `actorId`, `action`, `targetType`, `targetId`, `payload`, `ipAddress`, `userAgent`, `createdAt`.

---

### 3.7 Gateway Operations

These routes are handled directly by the gateway (not proxied) and are for operational use.

---

#### `GET /gateway/health`

Returns the health status of the API Gateway itself.

**Authentication:** None  
**Response (200):**
```json
{
  "service": "api-gateway",
  "status": "healthy",
  "uptime": 12345.67,
  "routes": ["auth", "planner", "ai", "monitoring"],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

#### `GET /gateway/routes`

Returns the configured upstream services and available route patterns.

**Authentication:** None  
**Response (200):**
```json
{
  "services": {
    "auth": { "host": "localhost", "port": 3001 },
    "planner": { "host": "localhost", "port": 3002 },
    "ai": { "host": "localhost", "port": 3003 },
    "monitoring": { "host": "localhost", "port": 3004 }
  },
  "routes": ["/auth/*", "/planning/*", "/ai-lite/*", "/monitoring/*", "/audit/*", "/metrics", "/gateway/*"]
}
```

---

#### `GET /gateway/circuit-breakers`

Returns the current state and metrics of all circuit breakers.

**Authentication:** None  
**Response (200):**
```json
{
  "circuitBreakers": {
    "auth": { "state": "CLOSED", "failureCount": 0, "successCount": 150, ... },
    "planner": { "state": "CLOSED", "failureCount": 0, "successCount": 42, ... },
    "ai": { "state": "CLOSED", "failureCount": 0, "successCount": 88, ... },
    "monitoring": { "state": "CLOSED", "failureCount": 0, "successCount": 30, ... }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Circuit Breaker States:** `CLOSED` (normal operation), `OPEN` (tripped, requests blocked), `HALF_OPEN` (testing recovery)

---

#### `POST /gateway/circuit-breakers/:name/reset`

Resets a specific circuit breaker to the `CLOSED` state.

**Authentication:** None  
**Path Parameters:** `:name` — one of `auth`, `planner`, `ai`, `monitoring`  
**Response (200):**
```json
{
  "message": "Circuit breaker 'auth' reset to CLOSED",
  "state": "CLOSED"
}
```
**Error Codes:** `404` (circuit breaker name not found)

---

#### `GET /metrics`

Prometheus metrics endpoint for monitoring and observability.

**Authentication:** None  
**Response (200):** Prometheus text-format metrics (content-type: `text/plain; version=0.0.4`)

---

#### `GET /auth/health`

Returns the health status of the Auth service (proxied to port 3001).

**Authentication:** None  
**Response (200):** JSON health object from the Auth service.

---

#### `GET /planner/health`

Returns the health status of the Planner service (proxied to port 3002).

**Authentication:** None  
**Response (200):** JSON health object from the Planner service.

---

#### `GET /ai/health`

Returns the health status of the AI service (proxied to port 3003).

**Authentication:** None  
**Response (200):** JSON health object from the AI service.

---

## 4. Error Codes

### 4.1 Standard Error Response Format

All REST endpoints return errors in the following JSON format:

```json
{
  "error": "Human-readable error message",
  "detail": "Additional technical details (optional)",
  "requested": "value",
  "authenticated": "value"
}
```

GraphQL errors follow the standard GraphQL error specification:

```json
{
  "errors": [
    {
      "message": "Error description",
      "extensions": {
        "code": "ERROR_CODE",
        "exception": { ... }
      },
      "locations": [{ "line": 1, "column": 20 }],
      "path": ["queryName"]
    }
  ]
}
```

### 4.2 HTTP Status Codes

| Code | Meaning | Common Scenarios |
|------|---------|-----------------|
| `200` | OK | Successful request |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid input, missing required fields, validation failure |
| `401` | Unauthorized | Missing or invalid/expired token |
| `403` | Forbidden | Insufficient role permissions or cross-tenant access violation |
| `404` | Not Found | Resource, route, or circuit breaker not found |
| `409` | Conflict | Duplicate email, duplicate family link |
| `429` | Too Many Requests | Rate limit exceeded or brute-force protection triggered |
| `500` | Internal Server Error | Unexpected server error |
| `502` | Bad Gateway | Upstream service unavailable or proxy error |
| `503` | Service Unavailable | Circuit breaker open (service temporarily unavailable) |

### 4.3 Common Error Responses

| Error | Status | Body |
|-------|--------|------|
| Missing Authorization header | `401` | `{"error": "Authorization header required"}` |
| Invalid or expired token | `401` | `{"error": "Invalid or expired token"}` |
| Cross-tenant access denied | `403` | `{"error": "Cross-tenant access denied", "requested": "uuid1", "authenticated": "uuid2"}` |
| Insufficient role permissions | `403` | `{"error": "Insufficient permissions", "required": "ADMIN", "userRole": "CHILD"}` |
| Rate limit exceeded | `429` | `{"error": "Too many requests", "retryAfterMs": 30000, "distributed": true}` |
| Brute force trigger | `429` | `{"error": "Too many attempts. Try again later.", "distributed": true}` |
| Service unavailable (circuit open) | `503` | `{"error": "Service 'auth' temporarily unavailable", "circuitState": "OPEN", "retryAfterMs": 30000}` |
| Upstream service error | `502` | `{"error": "Service 'planner' unavailable", "detail": "Connection refused"}` |

---

## 5. Rate Limiting & Circuit Breakers

### 5.1 Rate Limiting

Two tiers of rate limiting are enforced at the gateway:

| Tier | Window | Max Requests | Applied To |
|------|--------|-------------|------------|
| **Global** | 60 seconds | 200 | All auth routes (unauthenticated) |
| **API** | 60 seconds | 100 | All authenticated proxied routes |

Rate limiting is Redis-backed for distributed consistency across gateway instances, with an in-memory fallback if Redis is unavailable.

### 5.2 Circuit Breakers

Each upstream service has a dedicated circuit breaker with the following configuration:

| Parameter | Value |
|-----------|-------|
| `failureThreshold` | 5 consecutive failures |
| `cooldownMs` | 30,000 ms (30 seconds) |
| `successThreshold` | 2 consecutive successes (for half-open recovery) |
| `timeoutMs` | 10,000 ms (per-request timeout) |

States: `CLOSED` (normal) → `OPEN` (tripped) → `HALF_OPEN` (probing) → `CLOSED` (recovered)

### 5.3 Background Job Queues

The gateway manages four background queues for async processing:

| Queue | Retries | Backoff | Purpose |
|-------|---------|---------|---------|
| `ai-hints` | 3 | 2,000 ms | AI hint generation |
| `analytics` | 3 | 2,000 ms | Analytics event processing |
| `notifications` | 5 | 5,000 ms | Push/email notification delivery |
| `cleanup` | 2 | 10,000 ms | Scheduled cleanup tasks |

---

> **Document generated from:**  
> - `services/api/prisma/phase3/gateway.js` — API Gateway route definitions & proxy logic  
> - `services/api/src/schema.gql` — Auto-generated GraphQL schema (NestJS/Code First)  
> - `apps/web/src/lib/queries.ts` — Frontend Apollo Client query definitions  
> - `services/api/prisma/schema.prisma` — Database schema (Prisma ORM / PostgreSQL)  
> - `services/api/prisma/phase3/shared/security.js` — JWT, RBAC, rate limiting implementation
