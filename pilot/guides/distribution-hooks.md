# Distribution Hooks (Viral Loops)

## Hook 1: Shareable Weekly Progress Report

**Trigger:** Every Sunday, generate a personalized PDF/email summary.

**Content of report:**
- Child's name + week number
- "Completed X of Y planned activities this week"
- "Focus streak: Z days in a row"
- One positive AI-generated insight ("Your child spent extra time on reading!")
- CTA button: "View full dashboard" (for existing users)
- CTA button: "Start your family's journey" (with unique referral code for recipients)

**Implementation:**
- Report is generated as HTML → rendered in email (no PDF needed for MVP)
- Email is sent via transactional email service (Resend/SendGrid)
- Referral code is tracked: `ref=<parent_id>` in signup URL
- Referral reward: 1 month free for every 3 referrals who activate

**Metrics:**
- Weekly report open rate
- Report share rate (forwarded, clicked referral link)
- Referral conversion rate
- Virality coefficient (K-factor)

---

## Hook 2: Teacher/Coach Invite Flow

**Trigger:** Parent invites child's teacher or tutor to view progress.

**Flow:**
1. Parent enters teacher's email
2. Teacher receives: "[Parent] has invited you to view [Child]'s learning progress"
3. Teacher clicks → sees a read-only progress snapshot (no account needed)
4. Teacher sees: "Activities completed this week: X — Focus areas: Y, Z"
5. CTA: "Create your own family account" (teacher becomes an advocate/channel)

**Why this works:**
- Teachers are trusted by parents
- Teachers see the value immediately (better visibility into student progress)
- Teachers become organic promoters to other parents

**Metrics:**
- Teacher invite rate (per active parent)
- Teacher click-through rate
- Teacher-to-parent referral conversion

---

## Hook 3: Grandparent/Gift Access

**Trigger:** Parent shares a "grandparent view" link.

**Flow:**
- Parent generates a unique read-only link
- Link shows: "This week's completed activities" in a beautiful simple view
- No account required for grandparent
- Bottom of page: "Help your grandchild thrive — create a family account"

**Metrics:**
- Grandparent share rate
- Conversion from grandparent view to new signup

---

## Implementation Priority (MVP)

| Hook | Effort | Impact | Ship |
|------|--------|--------|------|
| Weekly progress email | Medium | High | Week 1 |
| Referral reward program | Low | Medium | Week 1 |
| Teacher invite | Medium | Medium | Week 2 |
| Grandparent view | Low | Low | Week 3 |
