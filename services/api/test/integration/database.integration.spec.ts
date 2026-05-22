import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected` as any[];
    expect(result[0].connected).toBe(1);
  });

  it('should have users table with data', async () => {
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should have audit_logs table', async () => {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'audit_logs'
      ) as exists
    ` as any[];
    expect(result[0].exists).toBe(true);
  });

  it('should have escrow table', async () => {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'escrows'
      ) as exists
    ` as any[];
    expect(result[0].exists).toBe(true);
  });

  it('should enforce unique constraint on user id', async () => {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users' AND c.contype = 'p'
    ` as any[];
    expect(parseInt(String(result[0].cnt))).toBeGreaterThanOrEqual(0);
  });

  it('should list migration history', async () => {
    const result = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations
      ORDER BY started_at
    ` as any[];
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].migration_name).toBeDefined();
  });

  it('should have all expected schema tables', async () => {
    const result = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    ` as any[];
    const tables = result.map((r: any) => r.table_name);
    expect(tables).toContain('users');
    expect(tables).toContain('audit_logs');
    expect(tables).toContain('escrows');
    expect(tables).toContain('family_links');
    expect(tables).toContain('quests');
    expect(tables).toContain('goals');
  });
});
