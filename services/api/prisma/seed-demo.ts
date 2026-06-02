import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://udb:udb@localhost:5432/udb?schema=public' } },
});

const USERS = {
  sarah: { id: 'c84ffa1f-6dcd-40db-bd38-7909127ef248', email: 'sarah.demo@udb.app', name: 'Sarah Johnson' },
  leo: { id: '3d9a63fb-e3e0-4935-9980-4d73deb63206', email: 'leo.demo@udb.app', name: 'Leo Johnson' },
  maya: { id: '660e1c21-ae02-4413-b8e1-8fc232a96510', email: 'maya.demo@udb.app', name: 'Maya Johnson' },
  alex: { id: '81dc1369-e638-4dc7-9532-41d9eb7e5bb8', email: 'admin.demo@udb.app', name: 'Alex Admin' },
};

async function main() {
  console.log('Seeding demo data...');

  // Step 1: Update roles
  console.log('Updating roles...');
  await prisma.user.update({ where: { id: USERS.sarah.id }, data: { role: 'PARENT' } });
  await prisma.user.update({ where: { id: USERS.alex.id }, data: { role: 'ADMIN' } });

  // Step 2: Family links
  console.log('Creating family links...');
  await prisma.familyLink.upsert({
    where: { parentId_childId: { parentId: USERS.sarah.id, childId: USERS.leo.id } },
    update: {},
    create: { parentId: USERS.sarah.id, childId: USERS.leo.id, consentVerified: true, consentMethod: 'CREDIT_CARD' },
  });
  await prisma.familyLink.upsert({
    where: { parentId_childId: { parentId: USERS.sarah.id, childId: USERS.maya.id } },
    update: {},
    create: { parentId: USERS.sarah.id, childId: USERS.maya.id, consentVerified: true, consentMethod: 'CREDIT_CARD' },
  });

  // Step 3: Update profiles
  console.log('Updating user profiles...');
  await prisma.user.update({
    where: { id: USERS.sarah.id },
    data: {
      displayName: USERS.sarah.name,
      avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=sarah',
      dateOfBirth: new Date('1985-06-15'), timezone: 'America/New_York',
      coppaConsentVerified: true, coppaConsentDate: new Date(),
      uupData: { gamification: { level: 12, xp: 15000, coin_balance: 5000, doter_state: 'LEGENDARY', streak: 45 }, biometric: { avg_sleep_hours: 7.2, stress_index: 0.3, focus_score: 80 }, metadata: { coppa_consent: true, onboarding_completed: true } },
    },
  });
  await prisma.user.update({
    where: { id: USERS.leo.id },
    data: {
      displayName: USERS.leo.name,
      avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=leo',
      dateOfBirth: new Date('2014-03-22'), timezone: 'America/New_York',
      coppaConsentVerified: true, coppaConsentDate: new Date(),
      uupData: { gamification: { level: 8, xp: 7200, coin_balance: 1250, doter_state: 'JUVENILE', streak: 12 }, academic: { math_rit: 215, reading_rit: 220, lms_sync_status: 'active', skill_gaps: { Algebra: 0.45, Fractions: 0.22, Reading_Comprehension: 0.80 } }, biometric: { avg_sleep_hours: 8.5, stress_index: 0.15, focus_score: 82 }, entrepreneurship: { active_projects: ['Lemonade Stand'], total_revenue_usd: 45 }, metadata: { coppa_consent: true, onboarding_completed: true } },
    },
  });
  await prisma.user.update({
    where: { id: USERS.maya.id },
    data: {
      displayName: USERS.maya.name,
      avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=maya',
      dateOfBirth: new Date('2011-11-08'), timezone: 'America/New_York',
      coppaConsentVerified: true, coppaConsentDate: new Date(),
      uupData: { gamification: { level: 5, xp: 3800, coin_balance: 800, doter_state: 'HATCHLING', streak: 5 }, academic: { math_rit: 195, reading_rit: 210, lms_sync_status: 'active', skill_gaps: { Geometry: 0.55, Vocabulary: 0.30 } }, biometric: { avg_sleep_hours: 9.0, stress_index: 0.1, focus_score: 75 }, entrepreneurship: { active_projects: ['Bracelet Shop'], total_revenue_usd: 12 }, metadata: { coppa_consent: true, onboarding_completed: true } },
    },
  });
  await prisma.user.update({
    where: { id: USERS.alex.id },
    data: {
      displayName: USERS.alex.name,
      avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=alex',
      dateOfBirth: new Date('1990-01-15'), timezone: 'America/New_York',
      uupData: { gamification: { level: 99, xp: 99999, coin_balance: 99999 }, metadata: { onboarding_completed: true } },
    },
  });

  // Step 4: Doter profiles
  console.log('Creating Doter profiles...');
  await prisma.doterProfile.upsert({
    where: { userId: USERS.leo.id }, update: {},
    create: { userId: USERS.leo.id, name: 'Sparky', state: 'JUVENILE', level: 8, xp: 7200, coinBalance: 1250, streakDays: 12, isSluggy: false, isEnergetic: true, skinId: 'default', accessories: ['blue_cap', 'lightning_aura'], evolutionHistory: [{ state: 'EGG', unlockedAt: new Date(Date.now() - 90 * 86400000).toISOString() }, { state: 'HATCHLING', unlockedAt: new Date(Date.now() - 75 * 86400000).toISOString() }, { state: 'JUVENILE', unlockedAt: new Date(Date.now() - 30 * 86400000).toISOString() }] },
  });
  await prisma.doterProfile.upsert({
    where: { userId: USERS.maya.id }, update: {},
    create: { userId: USERS.maya.id, name: 'Blossom', state: 'HATCHLING', level: 5, xp: 3800, coinBalance: 800, streakDays: 5, isSluggy: false, isEnergetic: false, skinId: 'default', accessories: ['flower_crown'], evolutionHistory: [{ state: 'EGG', unlockedAt: new Date(Date.now() - 60 * 86400000).toISOString() }, { state: 'HATCHLING', unlockedAt: new Date(Date.now() - 20 * 86400000).toISOString() }] },
  });

  // Step 5: Goals
  console.log('Creating goals...');
  const leoMathGoal = await prisma.goal.create({ data: { userId: USERS.leo.id, title: 'Math Proficiency', description: 'Master fractions and algebra by end of semester', pillar: 'ACADEMIC', targetWeight: 100, currentWeight: 35, dueDate: new Date('2026-06-30') } });
  const leoHealthGoal = await prisma.goal.create({ data: { userId: USERS.leo.id, title: 'Healthy Habits Master', description: 'Maintain good sleep and exercise routines for 30 days', pillar: 'BIOMETRIC', targetWeight: 100, currentWeight: 68, dueDate: new Date('2026-05-30') } });
  const leoLifeGoal = await prisma.goal.create({ data: { userId: USERS.leo.id, title: 'Life Skills Champion', description: 'Complete daily chores independently', pillar: 'LIFE_SKILLS', targetWeight: 100, currentWeight: 80, dueDate: new Date('2026-05-15') } });
  const mayaArtGoal = await prisma.goal.create({ data: { userId: USERS.maya.id, title: 'Creative Arts', description: 'Complete 3 art projects this month', pillar: 'SOCIAL', targetWeight: 100, currentWeight: 40, dueDate: new Date('2026-06-15') } });
  const mayaReadGoal = await prisma.goal.create({ data: { userId: USERS.maya.id, title: 'Reading Adventure', description: 'Read 2 chapter books this month', pillar: 'ACADEMIC', targetWeight: 100, currentWeight: 25, dueDate: new Date('2026-06-01') } });

  // Step 6: Quests
  console.log('Creating quests...');
  await prisma.quest.createMany({ data: [
    { userId: USERS.leo.id, title: 'Complete 10 Fraction Worksheets', description: 'Practice fractions every day this week', pillar: 'ACADEMIC', status: 'IN_PROGRESS', xpReward: 200, coinReward: 100, goalId: leoMathGoal.id, masteryWeight: 15, dueDate: new Date(Date.now() + 3 * 86400000) },
    { userId: USERS.leo.id, title: 'Sleep 8+ Hours for 5 Days', description: 'Track your sleep using the app', pillar: 'BIOMETRIC', status: 'IN_PROGRESS', xpReward: 150, coinReward: 75, goalId: leoHealthGoal.id, masteryWeight: 10, dueDate: new Date(Date.now() + 5 * 86400000) },
    { userId: USERS.leo.id, title: 'Read 1 Chapter of Your Book', description: 'Daily reading habit', pillar: 'ACADEMIC', status: 'PENDING', xpReward: 100, coinReward: 50, goalId: leoMathGoal.id, dueDate: new Date(Date.now() + 1 * 86400000) },
    { userId: USERS.leo.id, title: 'Make Your Bed for a Week', description: 'Complete your morning routine', pillar: 'LIFE_SKILLS', status: 'APPROVED', xpReward: 120, coinReward: 60, goalId: leoLifeGoal.id },
    { userId: USERS.leo.id, title: 'Lemonade Stand Business Plan', description: 'Write a simple business plan for your lemonade stand', pillar: 'ENTREPRENEURSHIP', status: 'SUBMITTED', xpReward: 300, coinReward: 150, dueDate: new Date(Date.now() + 7 * 86400000) },
    { userId: USERS.maya.id, title: 'Draw a Nature Scene', description: 'Create a drawing of your favorite outdoor place', pillar: 'SOCIAL', status: 'IN_PROGRESS', xpReward: 100, coinReward: 50, goalId: mayaArtGoal.id, masteryWeight: 20, dueDate: new Date(Date.now() + 4 * 86400000) },
    { userId: USERS.maya.id, title: "Read Charlotte's Web Chapter 1-3", description: 'Start your reading adventure', pillar: 'ACADEMIC', status: 'PENDING', xpReward: 150, coinReward: 75, goalId: mayaReadGoal.id, dueDate: new Date(Date.now() + 6 * 86400000) },
    { userId: USERS.maya.id, title: 'Practice Spelling Words', description: 'Spelling list for this week', pillar: 'ACADEMIC', status: 'APPROVED', xpReward: 80, coinReward: 40, goalId: mayaReadGoal.id },
  ] });

  // Step 7: Points Ledger
  console.log('Creating transaction history...');
  await prisma.pointsLedger.createMany({ data: [
    { userId: USERS.leo.id, transactionType: 'EARN', amount: 200, balanceAfter: 200, source: 'QUEST', description: 'Quest: Make Your Bed - Week 1' },
    { userId: USERS.leo.id, transactionType: 'EARN', amount: 150, balanceAfter: 350, source: 'QUEST', description: 'Quest: Reading Challenge' },
    { userId: USERS.leo.id, transactionType: 'EARN', amount: 500, balanceAfter: 850, source: 'BONUS', description: 'Streak Bonus: 10 Days!' },
    { userId: USERS.leo.id, transactionType: 'SPEND', amount: -100, balanceAfter: 750, source: 'PURCHASE', description: 'Doter Skin: Cosmic Blue' },
    { userId: USERS.leo.id, transactionType: 'EARN', amount: 300, balanceAfter: 1050, source: 'QUEST', description: 'Quest: Science Project Completed' },
    { userId: USERS.leo.id, transactionType: 'EARN', amount: 200, balanceAfter: 1250, source: 'MANUAL_AWARD', description: 'Mom awarded: Helped with dishes all week' },
    { userId: USERS.maya.id, transactionType: 'EARN', amount: 100, balanceAfter: 100, source: 'QUEST', description: 'Quest: Nature Drawing' },
    { userId: USERS.maya.id, transactionType: 'EARN', amount: 200, balanceAfter: 300, source: 'QUEST', description: 'Quest: Spelling Practice' },
    { userId: USERS.maya.id, transactionType: 'EARN', amount: 50, balanceAfter: 350, source: 'STREAK_REWARD', description: '3-Day Streak Bonus!' },
    { userId: USERS.maya.id, transactionType: 'SPEND', amount: -50, balanceAfter: 300, source: 'PURCHASE', description: 'Doter Accessory: Flower Crown' },
    { userId: USERS.maya.id, transactionType: 'EARN', amount: 500, balanceAfter: 800, source: 'BONUS', description: 'Weekly Challenge Complete!' },
  ] });

  // Step 8: Biometric logs
  console.log('Creating biometric logs...');
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const date = new Date(now); date.setDate(date.getDate() - i);
    await prisma.biometricLog.create({ data: { userId: USERS.leo.id, loggedAt: date, sleepHours: 7.5 + Math.random() * 1.5, hrv: 55 + Math.random() * 15, stressLevel: 0.1 + Math.random() * 0.2, focusScore: 70 + Math.random() * 20, heartRate: 70 + Math.random() * 10, steps: 6000 + Math.floor(Math.random() * 4000), source: 'MANUAL' } });
    await prisma.biometricLog.create({ data: { userId: USERS.maya.id, loggedAt: date, sleepHours: 8.0 + Math.random() * 1.5, hrv: 60 + Math.random() * 10, stressLevel: 0.05 + Math.random() * 0.1, focusScore: 65 + Math.random() * 20, heartRate: 72 + Math.random() * 8, steps: 5000 + Math.floor(Math.random() * 3000), source: 'MANUAL' } });
  }

  // Step 9: Skill gaps
  console.log('Creating skill gaps...');
  await prisma.skillGap.createMany({ data: [
    { userId: USERS.leo.id, subject: 'Fractions', pillar: 'ACADEMIC', gapScore: 0.22, lastPracticed: new Date() },
    { userId: USERS.leo.id, subject: 'Algebra', pillar: 'ACADEMIC', gapScore: 0.45, lastPracticed: new Date() },
    { userId: USERS.leo.id, subject: 'Reading Comprehension', pillar: 'ACADEMIC', gapScore: 0.80, lastPracticed: new Date() },
    { userId: USERS.leo.id, subject: 'Social Skills', pillar: 'SOCIAL', gapScore: 0.18, lastPracticed: new Date(Date.now() - 10 * 86400000) },
    { userId: USERS.maya.id, subject: 'Geometry', pillar: 'ACADEMIC', gapScore: 0.55, lastPracticed: new Date() },
    { userId: USERS.maya.id, subject: 'Vocabulary', pillar: 'ACADEMIC', gapScore: 0.30, lastPracticed: new Date() },
    { userId: USERS.maya.id, subject: 'Creative Writing', pillar: 'SOCIAL', gapScore: 0.40, lastPracticed: new Date(Date.now() - 5 * 86400000) },
  ] });

  // Step 10: Notifications
  console.log('Creating notifications...');
  await prisma.notification.createMany({ data: [
    { userId: USERS.leo.id, type: 'QUEST_REMINDER', title: 'Quest Due Tomorrow!', body: 'You have "Complete 10 Fraction Worksheets" due tomorrow. Keep going!' },
    { userId: USERS.sarah.id, type: 'SKILL_GAP_ALERT', title: 'Skill Gap Detected', body: "Leo hasn't practiced Social Skills in 10 days. We recommend a social quest!" },
    { userId: USERS.leo.id, type: 'LEVEL_UP', title: 'You Reached Level 8!', body: 'Amazing! Your Doter Sparky is evolving!' },
    { userId: USERS.maya.id, type: 'STREAK_ALERT', title: 'Keep Your Streak Alive!', body: "You're on a 5-day streak. Complete a quest today to keep it going!" },
    { userId: USERS.sarah.id, type: 'WEEKLY_UPDATE', title: 'Weekly Progress Report', body: 'Leo completed 4 quests this week and earned 420 coins!' },
    { userId: USERS.alex.id, type: 'SYSTEM_ALERT', title: 'New User Registrations', body: '4 new users registered in the last 24 hours.' },
  ] });

  // Step 11: Activities
  console.log('Creating calendar activities...');
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  await prisma.activity.createMany({ data: [
    { userId: USERS.leo.id, title: 'Deep Work: Fractions Practice', description: 'Focus session on fraction worksheets', pillar: 'ACADEMIC', startTime: new Date(tomorrow.getTime()), endTime: new Date(tomorrow.getTime() + 3600000), isDeepWork: true, goalId: leoMathGoal.id },
    { userId: USERS.leo.id, title: 'Soccer Practice', pillar: 'BIOMETRIC', startTime: new Date(tomorrow.getTime() + 5 * 3600000), endTime: new Date(tomorrow.getTime() + 6.5 * 3600000), goalId: leoHealthGoal.id },
    { userId: USERS.leo.id, title: 'Lemonade Stand - Prep & Sell', pillar: 'ENTREPRENEURSHIP', startTime: new Date(tomorrow.getTime() + 7 * 3600000 + 2 * 86400000), endTime: new Date(tomorrow.getTime() + 7 * 3600000 + 2 * 86400000 + 4 * 3600000) },
    { userId: USERS.maya.id, title: 'Art Time: Nature Drawing', pillar: 'SOCIAL', startTime: new Date(tomorrow.getTime() + 2 * 3600000), endTime: new Date(tomorrow.getTime() + 3 * 3600000), goalId: mayaArtGoal.id },
    { userId: USERS.maya.id, title: 'Reading Time: Charlotte Web', pillar: 'ACADEMIC', startTime: new Date(tomorrow.getTime() + 4 * 3600000), endTime: new Date(tomorrow.getTime() + 5 * 3600000), goalId: mayaReadGoal.id },
  ] });

  // Step 12: Streaks
  console.log('Creating streaks...');
  await prisma.streak.createMany({ data: [
    { userId: USERS.leo.id, pillar: 'ACADEMIC', currentDays: 12, longestDays: 21, lastActivity: new Date(Date.now() - 86400000) },
    { userId: USERS.leo.id, pillar: 'BIOMETRIC', currentDays: 5, longestDays: 14, lastActivity: new Date(Date.now() - 2 * 86400000) },
    { userId: USERS.leo.id, pillar: 'LIFE_SKILLS', currentDays: 3, longestDays: 7, lastActivity: new Date(Date.now() - 86400000) },
    { userId: USERS.maya.id, pillar: 'ACADEMIC', currentDays: 5, longestDays: 10, lastActivity: new Date(Date.now() - 86400000) },
    { userId: USERS.maya.id, pillar: 'SOCIAL', currentDays: 2, longestDays: 6, lastActivity: new Date(Date.now() - 86400000) },
  ] });

  // Step 13: Achievements
  console.log('Creating achievements...');
  await prisma.achievement.createMany({ data: [
    { userId: USERS.leo.id, title: 'First Quest', description: 'Completed your very first quest!', pillar: 'ACADEMIC', badgeUrl: '/badges/first-quest.svg', points: 100, isMinted: false },
    { userId: USERS.leo.id, title: 'Streak Master', description: 'Maintained a 7-day streak', pillar: 'LIFE_SKILLS', badgeUrl: '/badges/streak-master.svg', points: 250, isMinted: false },
    { userId: USERS.leo.id, title: 'Math Whiz', description: 'Completed 5 math quests', pillar: 'ACADEMIC', badgeUrl: '/badges/math-whiz.svg', points: 300, isMinted: false },
    { userId: USERS.maya.id, title: 'Budding Artist', description: 'Completed your first art quest', pillar: 'SOCIAL', badgeUrl: '/badges/budding-artist.svg', points: 100, isMinted: false },
  ] });

  // Step 14: Safety scores
  console.log('Creating safety scores...');
  await prisma.safetyScore.createMany({ data: [
    { userId: USERS.leo.id, score: 92, components: { messaging: 90, content: 95, social: 88, screen_time: 85 }, recordedAt: new Date() },
    { userId: USERS.maya.id, score: 95, components: { messaging: 92, content: 97, social: 90, screen_time: 88 }, recordedAt: new Date() },
  ] });

  // Step 15: Onboarding
  console.log('Creating onboarding status...');
  await prisma.onboardingStatus.upsert({ where: { userId: USERS.sarah.id }, update: {}, create: { userId: USERS.sarah.id, currentStep: 5, totalSteps: 5, completed: true, profileComplete: true, doterNamed: false, firstQuestDone: false, tourCompleted: true, role: 'PARENT' } });
  await prisma.onboardingStatus.upsert({ where: { userId: USERS.leo.id }, update: {}, create: { userId: USERS.leo.id, currentStep: 5, totalSteps: 5, completed: true, profileComplete: true, doterNamed: true, firstQuestDone: true, tourCompleted: true, role: 'CHILD' } });
  await prisma.onboardingStatus.upsert({ where: { userId: USERS.maya.id }, update: {}, create: { userId: USERS.maya.id, currentStep: 5, totalSteps: 5, completed: true, profileComplete: true, doterNamed: true, firstQuestDone: true, tourCompleted: true, role: 'CHILD' } });
  await prisma.onboardingStatus.upsert({ where: { userId: USERS.alex.id }, update: {}, create: { userId: USERS.alex.id, currentStep: 5, totalSteps: 5, completed: true, profileComplete: true, doterNamed: false, firstQuestDone: false, tourCompleted: true, role: 'ADMIN' } });

  console.log('Demo data seeded successfully!');
  console.log(`  Parent: ${USERS.sarah.email} (id: ${USERS.sarah.id})`);
  console.log(`  Child:  ${USERS.leo.email} (id: ${USERS.leo.id})`);
  console.log(`  Child:  ${USERS.maya.email} (id: ${USERS.maya.id})`);
  console.log(`  Admin:  ${USERS.alex.email} (id: ${USERS.alex.id})`);
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
