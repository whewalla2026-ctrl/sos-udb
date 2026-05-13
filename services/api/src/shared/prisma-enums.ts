// Replacements for Prisma-generated enums to support tests without the Prisma client enum exports
export enum DoterState {
  EGG = 'EGG',
  HATCHLING = 'HATCHLING',
  JUVENILE = 'JUVENILE',
  ADOLESCENT = 'ADOLESCENT',
  ADULT = 'ADULT',
  LEGENDARY = 'LEGENDARY',
}

export enum QuestPillar {
  ACADEMIC = 'ACADEMIC',
  BIOMETRIC = 'BIOMETRIC',
  GAMIFICATION = 'GAMIFICATION',
  ENTREPRENEURSHIP = 'ENTREPRENEURSHIP',
  SOCIAL = 'SOCIAL',
  LIFE_SKILLS = 'LIFE_SKILLS',
  SKILLS = 'SKILLS',
}

export enum QuestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum TransactionSource {
  QUEST = 'QUEST',
  MANUAL_AWARD = 'MANUAL_AWARD',
  ESCROW = 'ESCROW',
  PURCHASE = 'PURCHASE',
  BONUS = 'BONUS',
  STREAK_REWARD = 'STREAK_REWARD',
}

export enum TransactionType {
  EARN = 'EARN',
  SPEND = 'SPEND',
  REVERSE = 'REVERSE',
  ESCROW_HOLD = 'ESCROW_HOLD',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}
