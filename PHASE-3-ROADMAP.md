# 🚀 UDB Phase 3 Roadmap: Expanded End-to-End Coverage

## 1. Overview
Phase 3 transitions the **Unified Developmental Backbone (UDB)** from a functional backend foundation to a fully operational ecosystem. The focus is on **Cross-Pillar Intelligence**, **Gamified Evolution**, **Blockchain-Verified Achievements**, and **Financial Agency**.

---

## 2. Core Milestones & Technical Objectives

### 🏗️ Milestone 3.1: Socratic Tutor End-to-End (AI Mentoring)
*   **Goal**: Move from simple chat to a context-aware, scaffolding-first pedagogical agent.
*   **Tasks**:
    *   [ ] Implement **RAG Pipeline** in `ai-mentor` service using Pinecone.
    *   [ ] Integrate **LMS context** (Canvas/Google Classroom assignments) into tutor prompts.
    *   [ ] Develop **Path-to-Solution** tracking (Model: `TutoringSession.pathToSolution`).
    *   [ ] Build "Frustration Detection" sentiment analysis to trigger hints.
*   **Success Metric**: Tutor provides 3 hints before revealing a conceptual bridge, verified by AI-Confidence score > 0.85.

### 🔄 Milestone 3.2: UUP Sync & Cross-Pillar Propagation
*   **Goal**: Finalize the "Backbone" logic where one life event ripples through all developmental metrics.
*   **Tasks**:
    *   [ ] Extend `UupSyncService` to handle `entrepreneurship` and `social` pillars.
    *   [ ] Implement **Biometric -> Academic Rescheduling**: If stress is high, suggest moving "Deep Work" sessions in `Activity` calendar.
    *   [ ] Connect **Academic Mastery -> Marketplace Perks**: High GPA unlocks lower escrow fees or premium Doter items.
*   **Success Metric**: A "Low Sleep" biometric event successfully triggers a "Sluggish" Doter state AND a "Focus Sprint" notification.

### 👾 Milestone 3.3: Doter Evolution (Avatar State Machine)
*   **Goal**: Transform the Doter from a static pet to a dynamic representation of the user's growth.
*   **Tasks**:
    *   [ ] Implement the **Evolution Logic** (EGG -> HATCHLING -> JUVENILE -> etc.) gated by `Milestone Quests`.
    *   [ ] Build the **Visual Asset Mapping**: Link `DoterProfile.skinId` and `accessories` to Three.js/Unity renderers.
    *   [ ] Develop **Real-time Buffs/Debuffs** based on active streaks (Model: `Streak.currentDays`).
*   **Success Metric**: Doter evolves to "Juvenile" state upon completion of 10 Academic Quests and 5 Biometric Quests.

### ⛓️ Milestone 3.4: Edu-Blockchain (SBT Mint & Verify)
*   **Goal**: Issue non-transferable Soul-Bound Tokens (SBTs) on the Polygon network for verifiable skill mastery.
*   **Tasks**:
    *   [ ] Deploy **SBT Smart Contract** (ERC-5192/721 compatible) on Polygon Testnet.
    *   [ ] Integrate `blockchain` module in `services/api` to trigger minting upon `Goal` completion.
    *   [ ] Implement **Wallet Verification** flow for parents/children.
*   **Success Metric**: A completed "Python Intermediate" goal successfully mints an SBT and updates `Achievement.sbtTokenId`.

### 💸 Milestone 3.5: Kid-Preneur Marketplace & Stripe Escrow
*   **Goal**: Operationalize the financial lifecycle for youth entrepreneurship.
*   **Tasks**:
    *   [ ] Implement **Stripe Connect** onboarding for youth ventures.
    *   [ ] Build the **Escrow Lifecycle**: `HELD` -> `PROOF_SUBMITTED` -> `PARENT_REVIEW` -> `RELEASED`.
    *   [ ] Develop **Proof-of-Work Verification**: AI analysis of delivered "Work Evidence" (Model: `EvidenceItem`).
*   **Success Metric**: A "Freelance Design" job completes with funds held in escrow and released only after parent approval of the uploaded JPG/PDF.

### 🧪 Milestone 3.6: CI/CD & E2E Expansion
*   **Goal**: Ensure 100% reliability of the integrated Phase 3 stack.
*   **Tasks**:
    *   [ ] Expand `e2e.yml` to include blockchain simulation (Hardhat/Anvil).
    *   [ ] Add **Stress Testing** for `UUP Sync` under high concurrency (1000+ RPS).
    *   [ ] Implement **Snapshot Testing** for Doter Evolution states.

---

## 3. Seed Data Extension Plan
To support development and testing, `prisma/seed.ts` will be extended with:
*   **Biometric Graphs**: 30 days of HRV, Sleep, and Stress data for "Active" and "At-Risk" child profiles.
*   **Academic Matrix**: Mock LMS connections with 50+ assignments and predicted difficulties.
*   **Marketplace Seeds**: 10 active Ventures and 5 Escrow transactions in various states.
*   **Blockchain Mocks**: Pre-populated Achievement records with mock transaction hashes.

---

## 4. Phase 3 Test Scenarios (E2E Specs)

| ID | Scenario | Expected Outcome |
| :--- | :--- | :--- |
| **E2E-3.1** | **The Sluggish Doter** | Sync Sleep < 5h -> Check Doter `isSluggy: true` -> Check Notification sent. |
| **E2E-3.2** | **Socratic Bridge** | Student asks "What is 2+2?" -> Tutor responds with "If you have two Doters and find two more..." |
| **E2E-3.3** | **SBT Minting Flow** | Complete "Math Master" Goal -> Trigger Minting -> Achievement updated with Contract Addr. |
| **E2E-3.4** | **Escrow Release** | Submit Work -> Parent Approves -> Escrow status moves from `HELD` to `RELEASED`. |
| **E2E-3.5** | **Evolution Gate** | Complete 10 Quests -> Doter state moves from `HATCHLING` to `JUVENILE`. |

---

## 5. Technical Stack (Phase 3 Focus)
*   **Backend**: NestJS, Prisma, Redis (Pub/Sub).
*   **AI**: OpenAI GPT-4o, Pinecone (Vector DB), TensorFlow.js (Vision).
*   **Web3**: Polygon (SBTs), Ethers.js, Hardhat.
*   **Payments**: Stripe Connect (Escrow).
*   **3D**: Three.js (Doter Rendering).
*   **E2E**: Playwright, Jest.
