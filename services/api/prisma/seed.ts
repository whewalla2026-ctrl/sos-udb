import { PrismaClient } from '@prisma/client';
import { DoterState, QuestPillar, QuestStatus } from '../../src/shared/prisma-enums';
import { UserRole } from '../../src/shared/user-role';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding UDB database...');

  // ── Create Parent User ──────────────────────────────────────────────────────
  const parent = await prisma.user.upsert({
    where: { email: 'parent@udb.dev' },
    update: {},
    create: {
      firebaseUid: 'seed-parent-uid-001',
      email: 'parent@udb.dev',
      displayName: 'Sarah Johnson',
      avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=sarah',
      role: UserRole.PARENT,
      dateOfBirth: new Date('1985-06-15'),
      coppaConsentVerified: true,
      coppaConsentDate: new Date(),
      uupData: {
        gamification: { level: 5, xp: 4500, coin_balance: 2500, doter_state: 'ADULT', streak: 30 },
        academic: { math_rit: 0, reading_rit: 0, lms_sync_status: 'active', skill_gaps: {} },
        biometric: { avg_sleep_hours: 7.5, stress_index: 0.35, focus_score: 75, last_sync: new Date().toISOString() },
        entrepreneurship: { active_projects: [], total_revenue_usd: 0, wallet_balance: 500 },
        metadata: { blockchain_wallet: null, coppa_consent: true },
      },
      accessibilitySettings: { dyslexiaMode: false, highContrast: false, tts: false, fontSize: 'medium' },
    },
  });

  // ── Create Child User ───────────────────────────────────────────────────────
  const child = await prisma.user.upsert({
    where: { email: 'leo@udb.dev' },
    update: {},
    create: {
      firebaseUid: 'seed-child-uid-001',
      email: 'leo@udb.dev',
      displayName: 'Leo Johnson',
      avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=leo',
      role: UserRole.CHILD,
      dateOfBirth: new Date('2014-03-22'),
      coppaConsentVerified: true,
      coppaConsentDate: new Date(),
      uupData: {
        gamification: { level: 8, xp: 7200, coin_balance: 1250, doter_state: 'JUVENILE', streak: 12 },
        academic: { math_rit: 215, reading_rit: 220, lms_sync_status: 'active', skill_gaps: { 'Algebra': 0.45, 'Fractions': 0.22, 'Reading Comprehension': 0.80 } },
        biometric: { avg_sleep_hours: 8.5, stress_index: 0.15, focus_score: 82, last_sync: new Date().toISOString() },
        entrepreneurship: { active_projects: ['Lemonade Stand'], total_revenue_usd: 45, wallet_balance: 125 },
        metadata: { blockchain_wallet: null, coppa_consent: true },
      },
      accessibilitySettings: { dyslexiaMode: false, highContrast: false, tts: false, fontSize: 'medium' },
    },
  });

  // ── Create Doter for Leo ────────────────────────────────────────────────────
  await prisma.doterProfile.upsert({
    where: { userId: child.id },
    update: {},
    create: {
      userId: child.id,
      name: 'Sparky',
      state: DoterState.JUVENILE,
      level: 8,
      xp: 7200,
      coinBalance: 1250,
      streakDays: 12,
      isSluggy: false,
      isEnergetic: true,
    },
  });

  // ── Family Link ─────────────────────────────────────────────────────────────
  await prisma.familyLink.upsert({
    where: { parentId_childId: { parentId: parent.id, childId: child.id } },
    update: {},
    create: { parentId: parent.id, childId: child.id, consentVerified: true, consentMethod: 'CREDIT_CARD' },
  });

  // ── Goals ───────────────────────────────────────────────────────────────────
  const mathGoal = await prisma.goal.create({
    data: {
      userId: child.id,
      title: 'Math Proficiency',
      description: 'Master fractions and algebra by end of semester',
      pillar: QuestPillar.ACADEMIC,
      targetWeight: 100,
      currentWeight: 35,
      dueDate: new Date('2026-06-30'),
    },
  });

  const healthGoal = await prisma.goal.create({
    data: {
      userId: child.id,
      title: 'Healthy Habits Master',
      description: 'Maintain good sleep and exercise routines for 30 days',
      pillar: QuestPillar.BIOMETRIC,
      targetWeight: 100,
      currentWeight: 68,
      dueDate: new Date('2026-05-30'),
    },
  });

  // ── Quests ──────────────────────────────────────────────────────────────────
  await prisma.quest.createMany({
    data: [
      {
        userId: child.id,
        title: 'Complete 10 Fraction Worksheets',
        description: 'Practice fractions every day this week',
        pillar: QuestPillar.ACADEMIC,
        status: QuestStatus.IN_PROGRESS,
        xpReward: 200,
        coinReward: 100,
        goalId: mathGoal.id,
        masteryWeight: 15,
        dueDate: new Date('2026-05-10'),
      },
      {
        userId: child.id,
        title: 'Sleep 8+ Hours for 5 Days',
        description: 'Track your sleep using the app',
        pillar: QuestPillar.BIOMETRIC,
        status: QuestStatus.IN_PROGRESS,
        xpReward: 150,
        coinReward: 75,
        goalId: healthGoal.id,
        masteryWeight: 10,
        dueDate: new Date('2026-05-08'),
      },
      {
        userId: child.id,
        title: 'Read 1 Chapter of Your Book',
        description: 'Daily reading habit',
        pillar: QuestPillar.ACADEMIC,
        status: QuestStatus.PENDING,
        xpReward: 100,
        coinReward: 50,
        dueDate: new Date('2026-05-04'),
      },
      {
        userId: child.id,
        title: 'Make Your Bed for a Week',
        description: 'Complete your morning routine',
        pillar: QuestPillar.LIFE_SKILLS,
        status: QuestStatus.APPROVED,
        xpReward: 120,
        coinReward: 60,
      },
    ],
  });

  // ── Points Ledger ───────────────────────────────────────────────────────────
  await prisma.pointsLedger.createMany({
    data: [
      { userId: child.id, transactionType: 'EARN', amount: 200, balanceAfter: 200, source: 'QUEST', description: 'Quest: Make Your Bed - Week 1' },
      { userId: child.id, transactionType: 'EARN', amount: 150, balanceAfter: 350, source: 'QUEST', description: 'Quest: Reading Challenge' },
      { userId: child.id, transactionType: 'EARN', amount: 500, balanceAfter: 850, source: 'BONUS', description: '🎉 Streak Bonus: 10 Days!' },
      { userId: child.id, transactionType: 'SPEND', amount: -100, balanceAfter: 750, source: 'PURCHASE', description: 'Doter Skin: "Cosmic Blue"' },
      { userId: child.id, transactionType: 'EARN', amount: 300, balanceAfter: 1050, source: 'QUEST', description: 'Quest: Science Project Completed' },
      { userId: child.id, transactionType: 'EARN', amount: 200, balanceAfter: 1250, source: 'MANUAL', description: 'Mom awarded: Helped with dishes all week ❤️' },
    ],
  });

  // ── Biometric Logs ──────────────────────────────────────────────────────────
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    await prisma.biometricLog.create({
      data: {
        userId: child.id,
        loggedAt: date,
        sleepHours: 7.5 + Math.random() * 1.5,
        hrv: 55 + Math.random() * 15,
        stressLevel: 0.1 + Math.random() * 0.2,
        focusScore: 70 + Math.random() * 20,
        heartRate: 70 + Math.random() * 10,
        steps: 6000 + Math.floor(Math.random() * 4000),
        source: 'MANUAL',
      },
    });
  }

  // ── Skill Gaps ──────────────────────────────────────────────────────────────
  await prisma.skillGap.createMany({
    data: [
      { userId: child.id, subject: 'Fractions', pillar: QuestPillar.ACADEMIC, gapScore: 0.22, lastPracticed: new Date() },
      { userId: child.id, subject: 'Algebra', pillar: QuestPillar.ACADEMIC, gapScore: 0.45, lastPracticed: new Date() },
      { userId: child.id, subject: 'Reading Comprehension', pillar: QuestPillar.ACADEMIC, gapScore: 0.80, lastPracticed: new Date() },
      { userId: child.id, subject: 'Social Skills', pillar: QuestPillar.SOCIAL, gapScore: 0.18, lastPracticed: new Date(Date.now() - 10 * 86400000) },
    ],
  });

  // ── Notifications ───────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: child.id, type: 'QUEST_REMINDER', title: '📚 Quest Due Tomorrow!', body: 'You have "Complete 10 Fraction Worksheets" due tomorrow. Keep going!' },
      { userId: parent.id, type: 'SKILL_GAP_ALERT', title: '📊 Skill Gap Detected', body: 'Leo hasn\'t practiced Social Skills in 10 days. We recommend a social quest!' },
      { userId: child.id, type: 'LEVEL_UP', title: '🎉 You Reached Level 8!', body: 'Amazing! Your Doter Sparky is evolving!' },
    ],
  });

  // ── Activity Calendar ────────────────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await prisma.activity.createMany({
    data: [
      {
        userId: child.id,
        title: 'Deep Work: Fractions Practice',
        description: 'Focus session on fraction worksheets',
        pillar: QuestPillar.ACADEMIC,
        startTime: new Date(tomorrow.getTime()),
        endTime: new Date(tomorrow.getTime() + 3600000),
        isDeepWork: true,
        goalId: mathGoal.id,
      },
      {
        userId: child.id,
        title: 'Physical Activity: Soccer',
        pillar: QuestPillar.BIOMETRIC,
        startTime: new Date(tomorrow.getTime() + 5 * 3600000),
        endTime: new Date(tomorrow.getTime() + 6.5 * 3600000),
        goalId: healthGoal.id,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Parent: ${parent.email}`);
  console.log(`👦 Child: ${child.email}`);
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
