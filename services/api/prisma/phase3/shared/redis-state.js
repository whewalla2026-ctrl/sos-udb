const Redis = require('ioredis');
const crypto = require('crypto');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(t) { if (t > 3) return null; return Math.min(t * 200, 2000); },
  lazyConnect: true,
});

async function isTokenBlacklisted(token) {
  try {
    const jti = extractJti(token);
    if (!jti) return false;
    const result = await redis.get(`blacklist:${jti}`);
    return result === 'true';
  } catch { return false; }
}

function extractJti(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return body.jti || null;
  } catch { return null; }
}

async function blacklistToken(token) {
  try {
    const jti = extractJti(token);
    if (!jti) return;
    await redis.set(`blacklist:${jti}`, 'true', 'EX', 86400);
  } catch { /* silently fail */ }
}

async function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.pexpire(windowKey, windowMs);
  }
  return { allowed: count <= max, retryAfter: count > max ? windowMs - (now % windowMs) : 0 };
}

async function logAuditRedis(entry) {
  const key = `audit:${entry.id}`;
  await redis.setex(key, 86400 * 7, JSON.stringify(entry));
  await redis.lpush('audit:log', entry.id);
  await redis.ltrim('audit:log', 0, 9999);
}

async function getAuditLogRedis({ limit = 100, event, userId } = {}) {
  const ids = await redis.lrange('audit:log', 0, limit - 1);
  const entries = [];
  for (const id of ids) {
    const data = await redis.get(`audit:${id}`);
    if (data) {
      const entry = JSON.parse(data);
      if (event && entry.event !== event) continue;
      if (userId && entry.userId !== userId) continue;
      entries.push(entry);
    }
  }
  return entries;
}

async function getAiSpend(userId) {
  const val = await redis.get(`ai:spend:${userId}`);
  return val ? parseFloat(val) : 0;
}

async function addAiSpend(userId, amount) {
  const key = `ai:spend:${userId}`;
  const spent = await redis.incrbyfloat(key, amount);
  await redis.expire(key, 86400 * 30);
  return spent;
}

async function getRedis() {
  if (!redis.status || redis.status !== 'ready') {
    try { await redis.connect(); } catch { /* ignore */ }
  }
  return redis;
}

module.exports = {
  isTokenBlacklisted,
  blacklistToken,
  checkRateLimit,
  logAuditRedis,
  getAuditLogRedis,
  getAiSpend,
  addAiSpend,
  getRedis,
};
