import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MockOpenAIResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface MockPineconeResponse {
  matches: { id: string; score: number; metadata?: Record<string, any> }[];
}

export interface MockStripeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface MockS3Response {
  bucket: string;
  key: string;
  url: string;
}

export interface MockEmailResponse {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export interface MockBlockchainResponse {
  txHash: string;
  blockNumber: number;
  status: string;
}

export interface MockCleverResponse {
  districtId: string;
  schoolId: string;
  students: any[];
  teachers: any[];
  sections: any[];
}

export interface MockClassLinkResponse {
  orgId: string;
  schools: any[];
  users: any[];
  courses: any[];
}

export interface MockLMSResponse {
  courseId: string;
  assignments: any[];
  grades: any[];
  roster: any[];
}

@Injectable()
export class MockIntegrationService {
  private readonly logger = new Logger(MockIntegrationService.name);
  private requestCount = 0;

  constructor(private config: ConfigService) {}

  isRealMode(service: string): boolean {
    const key = this.config.get<string>(`${service.toUpperCase()}_API_KEY`);
    return !!key && key.length > 0 && key !== 'mock';
  }

  logCall(service: string, method: string): void {
    this.requestCount++;
    this.logger.debug(`[MOCK] ${service}.${method} (call #${this.requestCount})`);
  }

  async openaiComplete(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<MockOpenAIResponse> {
    this.logCall('OpenAI', 'complete');
    if (this.isRealMode('openai')) {
      this.logger.warn('OpenAI real mode not implemented in mock layer; falling back to mock');
    }
    const model = options?.model || 'gpt-4o-mini';
    return {
      content: `This is a simulated AI response for: "${prompt.substring(0, 50)}..."`,
      model,
      usage: { promptTokens: prompt.length / 4, completionTokens: 128 },
    };
  }

  async openaiEmbed(text: string): Promise<number[]> {
    this.logCall('OpenAI', 'embed');
    return Array.from({ length: 1536 }, (_, i) => Math.sin(i + text.length) * 0.1);
  }

  async pineconeQuery(vector: number[], topK = 5): Promise<MockPineconeResponse> {
    this.logCall('Pinecone', 'query');
    return {
      matches: Array.from({ length: Math.min(topK, 3) }, (_, i) => ({
        id: `mock-doc-${i + 1}`,
        score: 0.95 - i * 0.1,
        metadata: { title: `Mock Document ${i + 1}`, source: 'mock' },
      })),
    };
  }

  async pineconeUpsert(id: string, vector: number[], metadata?: Record<string, any>): Promise<void> {
    this.logCall('Pinecone', 'upsert');
  }

  async stripeCreatePayment(amount: number, currency: string, source: string): Promise<MockStripeResponse> {
    this.logCall('Stripe', 'createPayment');
    return {
      id: `pi_mock_${crypto.randomUUID().substring(0, 8)}`,
      status: 'succeeded',
      amount,
      currency,
    };
  }

  async stripeCreateSubscription(customerId: string, priceId: string): Promise<MockStripeResponse> {
    this.logCall('Stripe', 'createSubscription');
    return {
      id: `sub_mock_${crypto.randomUUID().substring(0, 8)}`,
      status: 'active',
      amount: 999,
      currency: 'usd',
    };
  }

  async stripeRefund(paymentId: string): Promise<MockStripeResponse> {
    this.logCall('Stripe', 'refund');
    return { id: paymentId, status: 'refunded', amount: 0, currency: 'usd' };
  }

  async s3Upload(key: string, _body: Buffer, contentType: string): Promise<MockS3Response> {
    this.logCall('S3', 'upload');
    return { bucket: 'udb-media-mock', key, url: `https://mock-s3.udb.app/${key}` };
  }

  async s3GetPresignedUrl(key: string): Promise<string> {
    this.logCall('S3', 'getPresignedUrl');
    return `https://mock-s3.udb.app/presigned/${key}?token=mock`;
  }

  async s3Delete(key: string): Promise<void> {
    this.logCall('S3', 'delete');
  }

  async emailSend(to: string, subject: string, _body: string): Promise<MockEmailResponse> {
    this.logCall('Email', 'send');
    this.logger.log(`[MOCK EMAIL] To: ${to}, Subject: "${subject}"`);
    return {
      messageId: `<mock-${crypto.randomUUID()}@udb.app>`,
      accepted: [to],
      rejected: [],
    };
  }

  async blockchainMintToken(userId: string, metadataUri: string): Promise<MockBlockchainResponse> {
    this.logCall('Blockchain', 'mintToken');
    return {
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      blockNumber: Math.floor(Math.random() * 10000000) + 20000000,
      status: 'confirmed',
    };
  }

  async blockchainVerifyToken(txHash: string): Promise<boolean> {
    this.logCall('Blockchain', 'verifyToken');
    return true;
  }

  async cleverSync(districtId: string): Promise<MockCleverResponse> {
    this.logCall('Clever', 'sync');
    return {
      districtId,
      schoolId: `school_mock_${districtId}`,
      students: [
        { id: 'clever-student-1', name: 'Alex Student', grade: '5' },
        { id: 'clever-student-2', name: 'Jordan Student', grade: '4' },
      ],
      teachers: [{ id: 'clever-teacher-1', name: 'Ms. Smith', email: 'ms.smith@school.edu' }],
      sections: [{ id: 'clever-section-1', name: 'Math Grade 5', teacherId: 'clever-teacher-1' }],
    };
  }

  async classLinkSync(orgId: string): Promise<MockClassLinkResponse> {
    this.logCall('ClassLink', 'sync');
    return {
      orgId,
      schools: [{ id: 'cl-school-1', name: 'Mock Elementary' }],
      users: [
        { id: 'cl-user-1', name: 'Teacher User', role: 'teacher' },
        { id: 'cl-user-2', name: 'Student User', role: 'student' },
      ],
      courses: [{ id: 'cl-course-1', name: 'Mathematics 101', code: 'MATH101' }],
    };
  }

  async lmsSyncRoster(courseId: string): Promise<MockLMSResponse> {
    this.logCall('LMS', 'syncRoster');
    return {
      courseId,
      assignments: [
        { id: 'lms-assign-1', title: 'Homework 1', dueDate: new Date().toISOString() },
      ],
      grades: [{ studentId: 'lms-student-1', assignmentId: 'lms-assign-1', score: 88 }],
      roster: [
        { id: 'lms-student-1', name: 'Sam Student', email: 'sam@school.edu' },
        { id: 'lms-student-2', name: 'Pat Student', email: 'pat@school.edu' },
      ],
    };
  }

  getCallCount(): number {
    return this.requestCount;
  }

  resetCallCount(): void {
    this.requestCount = 0;
  }
}

import * as crypto from 'crypto';
