process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://udb:udb@localhost:5432/udb?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-for-e2e-tests-min-32-chars!!';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
