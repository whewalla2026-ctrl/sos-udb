const crypto = require('crypto');
const redisState = require('./redis-state');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-32chars';
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY_SECONDS || '300');
const REFRESH_EXPIRY = parseInt(process.env.REFRESH_EXPIRY_SECONDS || '86400');
const BCRYPT_COST = 10;

// --- JWT-like token (HMAC-SHA256, no library needed) ---
function createToken(payload, expiresIn = JWT_EXPIRY) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, sub: payload.userId, jti: crypto.randomUUID(), iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresIn })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

async function verifyToken(token) {
  try {
    if (await redisState.isTokenBlacklisted(token)) return null;
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch { return null; }
}

async function blacklistToken(token) {
  await redisState.blacklistToken(token);
}

function createRefreshToken(userId) {
  return createToken({ userId, type: 'refresh' }, REFRESH_EXPIRY);
}

// --- RBAC ---
const ROLES = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', PARENT: 'PARENT', CHILD: 'CHILD' };
const ROLE_HIERARCHY = { ADMIN: 4, TEACHER: 3, PARENT: 2, CHILD: 1 };

function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (roles.length > 0 && !roles.some(r => hasRole(user.role, r))) {
      return res.status(403).json({ error: 'Insufficient permissions', required: roles, userRole: user.role });
    }
    next();
  };
}

// --- Redis-backed distributed rate limiting ---
const inMemoryFallback = new Map();

function rateLimit({ windowMs = 60000, max = 100, keyFn = (req) => req.ip } = {}) {
  return async (req, res, next) => {
    const key = keyFn(req);
    try {
      // Try Redis-based rate limiting first
      const result = await redisState.checkRateLimit(key, max, windowMs);
      if (!result.allowed) {
        return res.status(429).json({ error: 'Too many requests', retryAfterMs: result.retryAfter, distributed: true });
      }
    } catch (e) {
      // Fallback to in-memory rate limiting if Redis is unavailable
      const now = Date.now();
      if (!inMemoryFallback.has(key)) inMemoryFallback.set(key, []);
      const timestamps = inMemoryFallback.get(key).filter(t => now - t < windowMs);
      timestamps.push(now);
      inMemoryFallback.set(key, timestamps);
      if (timestamps.length > max) {
        return res.status(429).json({ error: 'Too many requests', retryAfterMs: windowMs, distributed: false });
      }
    }
    next();
  };
}

function clearRateLimitBuckets() {
  inMemoryFallback.clear();
}

// --- Password hashing ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.scryptSync(password, salt, 64).toString('hex') === hash;
}

// --- Audit logging (Redis-backed) ---
async function logAudit(event, { userId, action, resource, details, ip }) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    event,
    userId: userId || 'anonymous',
    action,
    resource: resource || 'unknown',
    details: details || {},
    ip: ip || '0.0.0.0',
  };
  try {
    await redisState.logAuditRedis(entry);
  } catch (e) {
    // silently fail audit — non-critical path
  }
  return entry;
}

async function getAuditLog({ limit = 100, event, userId } = {}) {
  try {
    return await redisState.getAuditLogRedis({ limit, event, userId });
  } catch {
    return [];
  }
}

module.exports = {
  createToken, verifyToken, blacklistToken, createRefreshToken,
  ROLES, hasRole, requireRole,
  rateLimit, clearRateLimitBuckets,
  hashPassword, verifyPassword,
  logAudit, getAuditLog,
};
