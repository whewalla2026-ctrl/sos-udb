#!/usr/bin/env node
/**
 * seed-redis.cjs — Seeds/resets user credentials in Redis
 *
 * Uses argon2id for password hashing (matching PasswordService/security.js).
 * Run after Redis restart or when credentials need resetting.
 *
 * Usage:
 *   node seed-redis.cjs                    # Uses REDIS_URL + DATABASE_URL from env
 *   REDIS_URL=redis://:pw@host:6379 node seed-redis.cjs
 *
 * IDEMPOTENT — safe to run multiple times. Existing cred:* keys are overwritten.
 */

const { createClient } = require('redis');
const { Pool } = require('pg');
const argon2 = require('argon2');

// ─── Credential Map ──────────────────────────────────────────
// email → password. Update this when adding users.
const CREDENTIALS = [
  // Demo accounts (seeded via seed-demo.ts / seed.ts)
  { email: 'parent@udb.dev',              password: 'DemoParent123!' },
  { email: 'leo@udb.dev',                 password: 'DemoKidPass123!' },
  { email: 'sarah.demo@udb.app',          password: 'DemoParent123!' },
  { email: 'leo.demo@udb.app',            password: 'DemoKidPass123!' },
  { email: 'maya.demo@udb.app',           password: 'DemoTeenPass123!' },
  { email: 'admin.demo@udb.app',          password: 'DemoAdmin123!' },
  { email: 'test-1780777221466@example.com', password: 'TestUserPass123!' },

  // Alpha families — Phase 5B + 5C (10 families)
  { email: 'river.family@udb.alpha',      password: 'AlphaRiver2026!' },
  { email: 'chen.family@udb.alpha',       password: 'AlphaChen2026!' },
  { email: 'patel.family@udb.alpha',      password: 'AlphaPatel2026!' },
  { email: 'taylor.family@udb.alpha',     password: 'AlphaTaylor2026!' },
  { email: 'kim.family@udb.alpha',        password: 'AlphaKim2026!' },
  { email: 'jones.family@udb.alpha',      password: 'AlphaJones2026!' },
  { email: 'garcia.family@udb.alpha',     password: 'AlphaGarcia2026!' },
  { email: 'miller.family@udb.alpha',     password: 'AlphaMiller2026!' },
  { email: 'davis.family@udb.alpha',      password: 'AlphaDavis2026!' },
  { email: 'wilson.family@udb.alpha',     password: 'AlphaWilson2026!' },
];

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://:changeme@localhost:6379';
  const dbUrl = process.env.DATABASE_URL || 'postgresql://udb:udb@localhost:6432/udb';

  console.log(`Connecting to Redis...`);

  const redis = createClient({ url: redisUrl });
  redis.on('error', (err) => {});
  await redis.connect();

  console.log(`Connecting to PostgreSQL...`);

  const pg = new Pool({ connectionString: dbUrl });

  console.log('Connected. Seeding credentials...\n');

  // Look up all users from PostgreSQL and build email→id map
  const userResult = await pg.query('SELECT id, email FROM users');
  const emailToId = {};
  for (const row of userResult.rows) {
    emailToId[row.email] = row.id;
  }

  let seeded = 0;
  let skipped = 0;

  for (const { email, password } of CREDENTIALS) {
    const userId = emailToId[email];

    if (!userId) {
      console.log(`  \u26A0 ${email} — not found in database (skipping)`);
      skipped++;
      continue;
    }

    const hash = await hashPassword(password);
    await redis.set(`cred:${userId}`, hash);

    const stored = await redis.get(`cred:${userId}`);
    if (stored && stored.startsWith('$argon2id$')) {
      console.log(`  \u2713 ${email} (${userId.slice(0, 8)}...) → argon2id stored`);
      seeded++;
    } else {
      console.log(`  \u2717 ${email} — write verification failed`);
      skipped++;
    }
  }

  console.log(`\nDone: ${seeded} seeded, ${skipped} skipped`);
  await pg.end();
  await redis.quit();
  process.exit(skipped > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
