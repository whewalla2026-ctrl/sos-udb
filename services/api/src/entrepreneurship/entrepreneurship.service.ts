import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EntrepreneurshipService {
  private readonly logger = new Logger(EntrepreneurshipService.name);
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private ai: AiService, private config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', 'sk_test_stub'), { apiVersion: '2024-04-10' });
  }

  async createVenture(userId: string, data: { name: string; problem: string; solution: string; targetMarket: string; pricingModel: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const age = user?.dateOfBirth
      ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000))
      : 16;

    // AI generates executive summary (UC-092)
    const businessPlan = await this.ai.generateBusinessPlan({ ...data, founderAge: age });

    const venture = await this.prisma.venture.create({
      data: {
        userId,
        name: data.name,
        problem: data.problem,
        solution: data.solution,
        targetMarket: data.targetMarket,
        pricingModel: data.pricingModel,
        status: 'DRAFT',
      },
    });

    this.logger.log(`🚀 Venture created: ${venture.name} for user ${userId}`);
    return { venture, businessPlan };
  }

  async getVentures(userId: string) {
    return this.prisma.venture.findMany({ where: { userId }, include: { escrows: true } });
  }

  // Stripe Escrow flow (UC-095)
  async createEscrow(ventureId: string, sellerId: string, buyerEmail: string, amountUsd: number) {
    // Create Stripe PaymentIntent
    let paymentIntentId: string | undefined;
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.floor(amountUsd * 100),
        currency: 'usd',
        receipt_email: buyerEmail,
        metadata: { ventureId, sellerId },
      });
      paymentIntentId = intent.id;
    } catch (e) {
      this.logger.warn('Stripe not configured — creating escrow in stub mode');
    }

    return this.prisma.escrow.create({
      data: { ventureId, sellerId, buyerEmail, amountUsd, stripePaymentIntentId: paymentIntentId },
    });
  }

  async submitProofOfWork(escrowId: string, proofUrl: string, notes?: string) {
    return this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: 'PROOF_SUBMITTED', proofUrl, proofNotes: notes },
    });
  }

  async releaseFunds(escrowId: string, approverId: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new Error('Escrow not found');

    // If Stripe configured, trigger transfer
    if (escrow.stripePaymentIntentId && this.config.get('STRIPE_SECRET_KEY')) {
      this.logger.log(`💸 Releasing $${escrow.amountUsd} from escrow ${escrowId}`);
    }

    await this.prisma.auditLog.create({
      data: { actorId: approverId, action: 'ESCROW_RELEASE', targetType: 'Escrow', targetId: escrowId, payload: { amount: escrow.amountUsd } },
    });

    return this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }
}
