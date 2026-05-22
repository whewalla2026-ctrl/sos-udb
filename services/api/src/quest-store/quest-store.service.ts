import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QuestSubmission {
  title: string;
  description: string;
  ageMin: number;
  ageMax: number;
  skillTags: string[];
  estimatedDuration: number;
  creatorId: string;
}

export interface QuestStoreListing {
  id: string;
  title: string;
  description: string;
  ageRange: [number, number];
  skillTags: string[];
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  price: number;
  downloads: number;
  rating: number;
}

@Injectable()
export class QuestStoreService {
  constructor(private prisma: PrismaService) {}

  async submitQuest(submission: QuestSubmission): Promise<string> {
    const questId = crypto.randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO quest_store (id, title, description, age_min, age_max, skill_tags, estimated_duration, creator_id, status, created_at)
      VALUES (
        ${questId},
        ${submission.title},
        ${submission.description},
        ${submission.ageMin},
        ${submission.ageMax},
        ${JSON.stringify(submission.skillTags)},
        ${submission.estimatedDuration},
        ${submission.creatorId},
        'pending_review',
        NOW()
      )
    `;

    return questId;
  }

  async moderateQuest(questId: string, approved: boolean, reason?: string): Promise<void> {
    const status = approved ? 'approved' : 'rejected';

    await this.prisma.$executeRaw`
      UPDATE quest_store SET status = ${status}, moderation_notes = ${reason || null}
      WHERE id = ${questId}
    `;
  }

  async searchQuests(query: string, filters: { ageMin?: number; ageMax?: number; skillTag?: string }): Promise<QuestStoreListing[]> {
    return [];
  }

  async purchaseQuest(questId: string, userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO quest_purchases (id, quest_id, user_id, purchased_at)
      VALUES (gen_random_uuid(), ${questId}, ${userId}, NOW())
    `;

    await this.prisma.$executeRaw`
      UPDATE quest_store SET downloads = downloads + 1 WHERE id = ${questId}
    `;
  }

  async getCreatorAnalytics(creatorId: string): Promise<any> {
    const quests = await this.prisma.$queryRaw<any[]>`
      SELECT id, title, downloads, rating FROM quest_store WHERE creator_id = ${creatorId}
    `;

    const totalRevenue = 0;

    return { quests, totalRevenue };
  }

  validateSkillTags(tags: string[]): boolean {
    const validTags = ['academic', 'math', 'reading', 'science', 'physical', 'social', 'creative', 'entrepreneurial', 'coding', 'music', 'art'];
    return tags.every(tag => validTags.includes(tag));
  }
}

import * as crypto from 'crypto';
