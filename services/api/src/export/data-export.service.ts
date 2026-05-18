import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../queue/queue.module';
import { S3Service } from '../shared/s3.service';

export interface DataExportRequest {
  userId: string;
  requestedBy: string;
  exportType: 'full' | 'academic' | 'biometric' | 'activity';
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly EXPORT_BUCKET = 'udb-exports';
  private readonly URL_EXPIRY_DAYS = 7;

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.DATA_EXPORT) private exportQueue: Queue,
    private s3Service: S3Service,
  ) {}

  async requestExport(request: DataExportRequest): Promise<{ exportId: string; downloadUrl?: string }> {
    const exportId = crypto.randomUUID();

    await this.exportQueue.add(
      'generate-export',
      { ...request, exportId },
      { jobId: exportId },
    );

    return { exportId };
  }

  async generateExport(request: DataExportRequest): Promise<string> {
    const exportData = {
      metadata: {
        exportId: crypto.randomUUID(),
        userId: request.userId,
        generatedAt: new Date().toISOString(),
        type: request.exportType,
      },
      profile: await this.getProfileData(request.userId),
      auditLogs: await this.getAuditData(request.userId),
      transactions: await this.getTransactionData(request.userId),
      sbtCredentials: await this.getSBTData(request.userId),
      biometricSummaries: await this.getBiometricData(request.userId),
      safetyScores: await this.getSafetyScoreData(request.userId),
      tutorHistory: await this.getTutorHistory(request.userId),
      plannerHistory: await this.getPlannerHistory(request.userId),
    };

    const jsonld = this.convertToJsonLD(exportData);
    const jsonBuffer = Buffer.from(JSON.stringify(jsonld, null, 2));

    const key = `exports/${request.userId}/${Date.now()}.jsonld`;
    const s3Url = await this.s3Service.upload(key, jsonBuffer, 'application/ld+json');

    return s3Url;
  }

  private async getProfileData(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? { email: user.email, role: user.role, createdAt: user.createdAt } : null;
  }

  private async getAuditData(userId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT action, entity_type, payload_hash, timestamp FROM audit_logs
      WHERE actor_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT 1000
    `;
  }

  private async getTransactionData(userId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT amount, type, status, hash, created_at FROM transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  }

  private async getSBTData(userId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT skill_tag, tx_hash, minted_at, status FROM sbts
      WHERE user_id = ${userId}
    `;
  }

  private async getBiometricData(userId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.prisma.$queryRaw`
      SELECT DATE(time) as date, AVG(sleep_hours) as avg_sleep, AVG(stress_index) as avg_stress
      FROM biometric_logs
      WHERE user_id = ${userId} AND time > ${thirtyDaysAgo}
      GROUP BY DATE(time)
    `;
  }

  private async getSafetyScoreData(userId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.prisma.$queryRaw`
      SELECT score, created_at FROM safety_scores
      WHERE user_id = ${userId} AND created_at > ${thirtyDaysAgo}
      ORDER BY created_at DESC
    `;
  }

  private async getTutorHistory(userId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT session_id, created_at FROM tutoring_sessions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
  }

  private async getPlannerHistory(userId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT week_start, status FROM planner_weeks
      WHERE user_id = ${userId}
      ORDER BY week_start DESC
      LIMIT 52
    `;
  }

  private convertToJsonLD(data: any): any {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://schema.org'
      ],
      '@type': 'VerifiablePresentation',
      ' verifiableCredential': [
        {
          '@type': 'VerifiableCredential',
          '@id': `urn:udb:profile:${data.metadata.exportId}`,
          'issuer': { '@id': 'did:web:udb.platform' },
          'issuanceDate': data.metadata.generatedAt,
          'credentialSubject': data.profile
        },
        {
          '@type': 'VerifiableCredential',
          '@id': `urn:udb:activity:${data.metadata.exportId}`,
          'issuer': { '@id': 'did:web:udb.platform' },
          'credentialSubject': { transactions: data.transactions, auditLogs: data.auditLogs }
        }
      ],
      metadata: data.metadata
    };
  }

  async generatePresignedUrl(s3Key: string): Promise<string> {
    return this.s3Service.getPresignedUrl(s3Key, this.URL_EXPIRY_DAYS * 24 * 60 * 60);
  }
}

import * as crypto from 'crypto';