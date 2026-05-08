const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log('Prisma Client connected to PostgreSQL');
  
  const result = await prisma.$queryRawUnsafe('SELECT current_database() as db, version() as ver');
  console.log('DB:', result[0].db);
  console.log('Version:', result[0].ver);
  
  // Create a test user
  const user = await prisma.user.create({
    data: {
      firebaseUid: 'test-validation-001',
      email: 'validation-test@udb.local',
      displayName: 'Validation Test User',
      role: 'CHILD',
    }
  });
  console.log('Created user:', user.id, user.email);
  
  // Read it back
  const found = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('Read back:', found.displayName, '-', found.role);
  
  await prisma.$disconnect();
  console.log('ALL DB VALIDATION PASSED');
}

main().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
