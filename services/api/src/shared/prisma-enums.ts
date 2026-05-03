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
  LIFE_SKILLS = 'LIFE_SKILLS',
  SOCIAL = 'SOCIAL',
}

export enum QuestStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
}

export enum TransactionSource {
  QUEST = 'QUEST',
  BONUS = 'BONUS',
  PURCHASE = 'PURCHASE',
  MANUAL = 'MANUAL',
}

export enum TransactionType {
  EARN = 'EARN',
  SPEND = 'SPEND',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}
