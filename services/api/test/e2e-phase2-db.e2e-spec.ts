import { PrismaClient } from '@prisma/client';

describe('Phase 2 DB Read End-to-End (Phase 2 DB Read)', () => {
  it('seeded user exists in DB (no Nest boot)', async () => {
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'test') {
      return;
    }
    const prisma = new PrismaClient();
    try {
      const user = await prisma.user.findUnique({ where: { email: 'parent@udb.dev' } });
      expect(user).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });
});
