# Feedback Form Distribution Plan

**Goal:** Collect Week 2 feedback from all 10 alpha families via Google Form.

## Step 1 — Create Google Form

1. Go to https://docs.google.com/forms/create
2. Copy questions from `docs/ALPHA_FAMILY_FEEDBACK.md` into the form
3. Enable "Collect email addresses" setting
4. Set response limit to 1 per person
5. Copy the published form URL into `ALPHA_FAMILY_FEEDBACK.md` once created

## Step 2 — Recipient List

Send the form to all parent accounts (10 families):

| # | Family | Email |
|---|--------|-------|
| 1 | River | river.family@udb.alpha |
| 2 | Chen | chen.family@udb.alpha |
| 3 | Patel | patel.family@udb.alpha |
| 4 | Taylor | taylor.family@udb.alpha |
| 5 | Kim | kim.family@udb.alpha |
| 6 | Jones | jones.family@udb.alpha |
| 7 | Garcia | garcia.family@udb.alpha |
| 8 | Miller | miller.family@udb.alpha |
| 9 | Davis | davis.family@udb.alpha |
| 10 | Wilson | wilson.family@udb.alpha |

Also send to the demo/pilot parent for informational purposes:
- sarah.demo@udb.app
- parent@udb.dev
- admin.demo@udb.app

## Step 3 — Distribution Email Template

Subject: UDB Alpha — We'd Love Your Feedback!

Hi {{family}} family,

Thank you for participating in the UDB closed alpha! We'd love to hear about your experience so far.

Please fill out this brief feedback form:
[FORM_URL]

It takes about 5 minutes. Your input directly shapes what we build next.

— The UDB Team

## Step 4 — Timing

- Send: 2026-06-10 (Day 7 of burn-in — gives families 1 week of PR #6 fixes)
- Reminder: 2026-06-14 (Day 11)
- Deadline: 2026-06-16 (Day 13 — day before Go/No-Go)

## Step 5 — Response Tracking

Track responses in BURN_IN_TRACKING.md > "Nice to Have" checklist:
- [ ] Feedback collected from 50%+ families (5+ responses)

If response rate is below 50% by 06-14, send a reminder or follow up individually.

## Credential Note

Due to the known credential issue (P2 — Redis cred:* hashes with unknown passwords), families who need to log in should:
1. Visit http://localhost:3030
2. Use "Forgot Password" to reset
3. Contact alpha-support@sos-udb.com for help
