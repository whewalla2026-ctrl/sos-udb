import { Controller, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BiometricService } from './biometric.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';

@Controller('cron')
export class ChronotypeCronService {
  private readonly logger = new Logger(ChronotypeCronService.name);

  constructor(
    private prisma: PrismaService,
    private bio: BiometricService,
    private uupSync: UUPSyncService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async updateChronotypes() {
    this.logger.log('Starting weekly chronotype clustering...');

    const users = await this.prisma.user.findMany({
      where: { role: 'CHILD' },
      select: { id: true },
    });

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        const chronotype = await this.bio.calculateChronotype(user.id);

        if (chronotype === 'neutral') {
          skipped++;
          continue;
        }

        await this.uupSync.sync({
          source: 'biometric',
          userId: user.id,
          data: {
            biometric: {
              chronotype: chronotype as 'morning_logic' | 'afternoon_creative' | 'evening_social' | 'neutral',
            },
          } as any,
          actorId: 'system',
          actorRole: 'ADMIN',
        });

        await this.prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CHRONOTYPE_UPDATED',
            payload: JSON.stringify({ chronotype, updatedAt: new Date().toISOString() }),
          },
        });

        updated++;
      } catch (error) {
        this.logger.error(`Failed to update chronotype for user ${user.id}: ${error.message}`);
      }
    }

    this.logger.log(`Chronotype clustering complete: ${updated} updated, ${skipped} skipped`);
  }
}
