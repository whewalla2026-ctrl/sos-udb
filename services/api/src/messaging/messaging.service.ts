import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService, private safety: SafetyService) {}

  async sendMessage(senderId: string, receiverId: string, content: string) {
    // Run safety analysis first (UC-047)
    const safetyResult = await this.safety.analyzeMessage(content);

    const message = await this.prisma.message.create({
      data: { senderId, receiverId, content, isSafe: safetyResult.isSafe, safetyScore: safetyResult.safetyScore },
    });

    // If unsafe, alert parent
    if (!safetyResult.isSafe) {
      await this.safety.recordSafetyScore(senderId, safetyResult.safetyScore, safetyResult.flags);
    }

    return message;
  }

  async getConversation(userA: string, userB: string, limit = 50) {
    return this.prisma.message.findMany({
      where: { OR: [{ senderId: userA, receiverId: userB }, { senderId: userB, receiverId: userA }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getInbox(userId: string) {
    return this.prisma.message.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
