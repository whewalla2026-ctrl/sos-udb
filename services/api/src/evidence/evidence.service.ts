import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EvidenceService {
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async addEvidence(userId: string, data: { questId?: string; title: string; type: string; url: string; thumbnailUrl?: string }) {
    const aiProTip = await this.ai.generateContextualFeedback(data.title, data.type, data.url);
    return this.prisma.evidenceItem.create({
      data: { userId, ...data, aiProTip },
    });
  }

  async getEvidenceGallery(userId: string) {
    return this.prisma.evidenceItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { quest: true } });
  }

  async addComment(evidenceId: string, userId: string, comment: string) {
    const item = await this.prisma.evidenceItem.findUnique({ where: { id: evidenceId } });
    if (!item) throw new Error('Evidence not found');
    const comments = (item.comments as any[]) || [];
    comments.push({ userId, comment, timestamp: new Date().toISOString() });
    return this.prisma.evidenceItem.update({ where: { id: evidenceId }, data: { comments } });
  }
}
