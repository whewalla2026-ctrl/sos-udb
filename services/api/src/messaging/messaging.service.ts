import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  moderated: boolean;
  flagged: boolean;
  createdAt: Date;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  async sendMessage(senderId: string, recipientId: string, content: string): Promise<Message> {
    const moderation = await this.moderateContent(content);

    const message: Message = {
      id: crypto.randomUUID(),
      senderId,
      recipientId,
      content: moderation.cleaned,
      moderated: true,
      flagged: moderation.flagged,
      createdAt: new Date(),
    };

    if (moderation.flagged) {
      this.eventEmitter.emit('message:flagged', { message, reason: moderation.reason });
    }

    this.eventEmitter.emit('message:sent', message);

    return message;
  }

  private async moderateContent(content: string): Promise<{ flagged: boolean; cleaned: string; reason?: string }> {
    const toxicityKeywords = ['violence', 'hate', 'grooming', 'explicit'];
    const lowerContent = content.toLowerCase();

    for (const keyword of toxicityKeywords) {
      if (lowerContent.includes(keyword)) {
        return { flagged: true, cleaned: content, reason: `Content contains: ${keyword}` };
      }
    }

    if (content.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
      return { flagged: true, cleaned: content, reason: 'Phone number detected' };
    }

    if (content.includes('http://') || content.includes('https://')) {
      return { flagged: true, cleaned: content.replace(/https?:\/\/[^\s]+/g, '[URL REMOVED]'), reason: 'External URL detected' };
    }

    return { flagged: false, cleaned: content };
  }

  async getMessages(userId: string, otherUserId: string, limit = 50, cursor?: string): Promise<{ messages: Message[]; nextCursor?: string }> {
    return { messages: [], nextCursor: undefined };
  }

  async reportMessage(messageId: string, reporterId: string, reason: string): Promise<void> {
    this.eventEmitter.emit('message:reported', { messageId, reporterId, reason });
  }
}

import * as crypto from 'crypto';