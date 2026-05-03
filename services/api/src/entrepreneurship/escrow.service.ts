import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_mock', {
      apiVersion: '2024-04-10' as any,
    });
  }

  async createEscrow(ventureId: string, sellerId: string, buyerEmail: string, amountUsd: number) {
    this.logger.log(`💰 Creating escrow for venture ${ventureId}, amount $${amountUsd}`);
    
    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amountUsd * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      capture_method: 'manual', // Hold funds in escrow
      metadata: { ventureId, sellerId, buyerEmail },
    });

    const escrow = await this.prisma.escrow.create({
      data: {
        ventureId,
        sellerId,
        buyerEmail,
        amountUsd,
        stripePaymentIntentId: paymentIntent.id,
        status: 'HELD',
      },
    });

    return { escrow, clientSecret: paymentIntent.client_secret };
  }

  async releaseEscrow(escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'PROOF_SUBMITTED') {
       // Logic for parent/buyer review would be here
       this.logger.warn('Escrow release requested but proof not verified.');
    }

    // Capture the payment (release to seller)
    if (escrow.stripePaymentIntentId) {
      await this.stripe.paymentIntents.capture(escrow.stripePaymentIntentId);
    }

    return this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });
  }

  async submitProof(escrowId: string, proofUrl: string, notes: string) {
    return this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        proofUrl,
        proofNotes: notes,
        status: 'PROOF_SUBMITTED',
      },
    });
  }
}
