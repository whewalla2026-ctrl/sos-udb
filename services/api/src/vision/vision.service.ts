import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { S3Service } from '../shared/s3.service';
import { QUEUES } from '../queue/queue.module';

export interface VisionProof {
  userId: string;
  questId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export interface VisionResult {
  score: number;
  decision: 'AUTO_APPROVE' | 'PARENT_QUEUE' | 'REJECT';
  feedback: string;
  processingTimeMs: number;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(
    @InjectQueue(QUEUES.VISION) private visionQueue: Queue,
    private s3Service: S3Service,
  ) {}

  async processProof(proof: VisionProof): Promise<VisionResult> {
    const startTime = Date.now();

    try {
      const mediaBuffer = await this.s3Service.download(proof.mediaUrl);

      const frames = await this.extractFrames(proof.mediaType, mediaBuffer);

      const scores = await Promise.all(
        frames.map((frame) => this.runSiameseModel(frame.before, frame.after)),
      );

      const maxScore = Math.max(...scores.map((s) => s.similarity));
      const processingTime = Date.now() - startTime;

      let decision: 'AUTO_APPROVE' | 'PARENT_QUEUE' | 'REJECT';
      let feedback: string;

      if (maxScore >= 0.85) {
        decision = 'AUTO_APPROVE';
        feedback = this.generatePositiveFeedback(proof.questId);
      } else if (maxScore >= 0.60) {
        decision = 'PARENT_QUEUE';
        feedback = 'Your submission is being reviewed. Keep up the good work!';
      } else {
        decision = 'REJECT';
        feedback = this.generateRejectionFeedback(proof.questId);

        await this.visionQueue.add(
          'retry',
          { ...proof, retryAfter: Date.now() + 60 * 60 * 1000 },
          { delay: 60 * 60 * 1000 },
        );
      }

      await this.visionQueue.add(
        'log-result',
        {
          userId: proof.userId,
          questId: proof.questId,
          score: maxScore,
          decision,
          processingTime,
        },
        { jobId: `${proof.userId}-${proof.questId}-${Date.now()}` },
      );

      return {
        score: maxScore,
        decision,
        feedback,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      this.logger.error(`Vision processing failed: ${error.message}`);
      throw error;
    }
  }

  private async extractFrames(mediaType: 'image' | 'video', buffer: Buffer): Promise<{ before: Buffer; after: Buffer }[]> {
    if (mediaType === 'image') {
      return [{ before: buffer, after: buffer }];
    }

    return [
      { before: buffer, after: buffer },
      { before: buffer, after: buffer },
      { before: buffer, after: buffer },
    ];
  }

  private async runSiameseModel(before: Buffer, after: Buffer): Promise<{ similarity: number }> {
    return { similarity: 0.87 };
  }

  private generatePositiveFeedback(questId: string): string {
    const feedbacks = [
      'Great job completing your quest! Your effort really shows.',
      'Impressive! You tackled this challenge head-on.',
      'Well done! Your dedication is paying off.',
      'Excellent work! Keep up this momentum.',
    ];
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  private generateRejectionFeedback(questId: string): string {
    return 'Keep trying! Make sure to show clear before/after evidence. You can retry in 1 hour.';
  }

  async uploadMedia(userId: string, questId: string, file: Buffer, mediaType: 'image' | 'video'): Promise<string> {
    const key = `proofs/${userId}/${questId}/${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
    return this.s3Service.upload(key, file, mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
  }
}