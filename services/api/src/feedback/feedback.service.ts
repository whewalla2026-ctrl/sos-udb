import { Injectable, Logger } from '@nestjs/common';
import { VisionService } from '../vision/vision.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface EvidenceFeedback {
  evidenceId: string;
  questTitle: string;
  score: number;
  feedback: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private visionService: VisionService,
    private eventEmitter: EventEmitter2,
  ) {}

  async generateFeedback(evidenceId: string, questTitle: string, userAge: number): Promise<EvidenceFeedback> {
    const visionResult = await this.visionService.processProof({
      userId: '',
      questId: '',
      mediaUrl: '',
      mediaType: 'image',
    });

    const score = visionResult.score;

    let feedback: string;

    if (score < 0.5) {
      feedback = "Great effort! Keep it up! You're on the right track.";
    } else {
      feedback = await this.generateConstructiveFeedback(questTitle, score, userAge);
    }

    const result: EvidenceFeedback = {
      evidenceId,
      questTitle,
      score,
      feedback,
    };

    this.eventEmitter.emit('feedback:generated', result);

    return result;
  }

  private async generateConstructiveFeedback(questTitle: string, score: number, userAge: number): Promise<string> {
    const templates = [
      `I noticed you completed "${questTitle}". The way you approached this shows great determination!`,
      `Excellent work on "${questTitle}". Your effort really shines through in this submission!`,
      `Great job completing "${questTitle}"! You're building strong habits.`,
      `I can see you put real thought into "${questTitle}". Keep this momentum going!`,
    ];

    const baseFeedback = templates[Math.floor(Math.random() * templates.length)];

    if (score >= 0.85) {
      return `${baseFeedback} Your attention to detail is impressive!`;
    } else if (score >= 0.60) {
      return `${baseFeedback} You're making solid progress!`;
    }

    return baseFeedback;
  }
}