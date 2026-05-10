# UDB Web App — Ready-for-Testing Guide

This repo’s `apps/web` is currently **UI-first with mock data** in many pages. This guide focuses on **testable behaviors** that work with `pnpm dev` and do **not** require the API to be running.

## Run it locally

From the repo root:

```bash
pnpm install
pnpm --filter @udb/web dev
```

Open:

- `http://localhost:3000`

Optional (only if you’re also testing API / DB flows later):

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm --filter @udb/api dev
```

## Key pages (URLs)

- **Landing**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/dashboard`
- **Weekly Planning Ritual**: `http://localhost:3000/dashboard/weekly-plan`
- **Socratic AI Tutor**: `http://localhost:3000/dashboard/tutor`
- **My Goals**: `http://localhost:3000/dashboard/goals`
- **My Quests**: `http://localhost:3000/dashboard/quests`

## Weekly Planning Ritual — what is test-ready

Page: `apps/web/src/app/dashboard/weekly-plan/page.tsx`

### Use case 1 — Switch days

- **Steps**:
  - Open `.../dashboard/weekly-plan`
  - Click day tabs: Mon → Tue → Wed …
  - Click “Week Overview” rows on the right
- **Expected**:
  - Active day changes and its activity list updates

### Use case 2 — Add an activity

- **Steps**:
  - Click **“+ Add Activity”**
  - Fill Title / Time / Duration / Pillar (optional Deep Work)
  - Click **“Add activity”**
- **Expected**:
  - New card appears in the day’s schedule
  - A small confirmation toast appears bottom-right

### Use case 3 — Edit an activity

- **Steps**:
  - Click **✏️** on an activity card
  - Change values
  - Click **“Save changes”**
- **Expected**:
  - Card updates immediately
  - Confirmation toast appears

### Use case 4 — Delete an activity

- **Steps**:
  - Click **🗑** on an activity card
  - Confirm deletion
- **Expected**:
  - Card is removed
  - Confirmation toast appears

### Use case 5 — Generate AI Plan (demo behavior)

- **Steps**:
  - Click **“✨ Generate AI Plan”**
- **Expected**:
  - Button shows loading briefly
  - Activities’ times shift slightly (simulated “AI” regeneration)
  - “AI Plan generated” toast appears

### Use case 6 — Finalize Week Plan (demo behavior)

- **Steps**:
  - Click **“✅ Finalize Week Plan”**
  - Confirm
- **Expected**:
  - Confirmation toast appears (“Saved locally (demo mode)”)

## Notes / known limitations (current)

- This is **not persisted** to a backend yet; refresh will reset to mock data.
- Some other dashboard pages are still “static UI” and may not have all buttons wired.

## Socratic AI Tutor — what is test-ready

Page: `apps/web/src/app/dashboard/tutor/page.tsx`

### Use case 1 — Send a message

- **Steps**:
  - Open `.../dashboard/tutor`
  - Type into the input at the bottom
  - Click the send button (paper plane) or press Enter
- **Expected**:
  - Your message appears on the right
  - A tutor response appears after a short delay
  - If your text includes “stuck/confused” or “tell me the answer”, intent changes (SCAFFOLDING/REFUSAL)

### Use case 2 — Change subject

- **Steps**:
  - Change the subject dropdown (top-right)
- **Expected**:
  - Subject selection updates (chat remains for demo)

## My Goals — what is test-ready

Page: `apps/web/src/app/dashboard/goals/page.tsx`

### Use case 1 — Create a new goal

- **Steps**:
  - Click **“+ New Goal”**
  - Fill in title, due date, target mastery, pillar
  - Click **“Create goal”**
- **Expected**:
  - A new goal card appears (top of list)
  - Confirmation toast appears

## My Quests — what is test-ready

Page: `apps/web/src/app/dashboard/quests/page.tsx`

### Use case 1 — Create a new quest

- **Steps**:
  - Click **“+ New Quest”**
  - Fill title and choose pillar
  - Click **“Create Quest”**
- **Expected**:
  - New quest appears in list (status: Pending)
  - Confirmation toast appears

### Use case 2 — Start a pending quest

- **Steps**:
  - Filter “Pending” (optional)
  - Click **“▶️ Start Quest”**
- **Expected**:
  - Quest moves to “In Progress”
  - Progress becomes \(>= 5\%\) so progress bar renders

### Use case 3 — Update progress (in progress quests)

- **Steps**:
  - Click **“✏️ Update Progress”**
  - Adjust the slider and click **Save**
- **Expected**:
  - Progress updates on the quest card
  - Confirmation toast appears

### Use case 4 — Submit evidence (in progress quests)

- **Steps**:
  - Click **“📤 Submit Evidence”**
  - Confirm
- **Expected**:
  - Quest status changes to “Submitted”
  - Progress becomes 100%
  - Confirmation toast appears

