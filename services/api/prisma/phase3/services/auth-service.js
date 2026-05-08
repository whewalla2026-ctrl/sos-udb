const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { createLogger, correlationId } = require('../shared/logger');
const { createToken, verifyToken, blacklistToken, createRefreshToken, hashPassword, verifyPassword, ROLES, logAudit, rateLimit } = require('../shared/security');
const eventBus = require('../shared/event-bus');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const log = createLogger('auth-service');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3, retryStrategy(t) { return t > 3 ? null : Math.min(t * 200, 2000); }, lazyConnect: true,
});

app.use(express.json());
app.use(correlationId);

const authRateLimit = rateLimit({ windowMs: 60000, max: 30 });

// POST /auth/register
app.post('/auth/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, displayName, role, age } = req.body;
    if (!email || !password || password.length < 8)
      return res.status(400).json({ error: 'Invalid email or password (min 8 chars)' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: { firebaseUid: `auth-${Date.now()}`, email, displayName: displayName || email.split('@')[0], role: role || 'CHILD' }
    });
    // Store credentials in Redis (Prisma schema has no passwordHash field)
    await redis.hmset(`user:${user.id}`, 'passwordHash', passwordHash, 'email', email, 'role', user.role);
    const token = createToken({ userId: user.id, role: user.role, email: user.email });
    const refreshToken = createRefreshToken(user.id);
    await eventBus.publish('user_created', { userId: user.id, email: user.email, role: user.role });
    logAudit('AUTH_REGISTER', { userId: user.id, action: 'register', resource: 'user', ip: req.ip });
    log.info('User registered', { userId: user.id, email: user.email });
    return res.status(201).json({ userId: user.id, email: user.email, token, refreshToken, displayName: user.displayName, role: user.role });
  } catch (err) {
    log.error('Register failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
app.post('/auth/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const creds = await redis.hgetall(`user:${user.id}`);
    if (!creds || !creds.passwordHash) return res.status(401).json({ error: 'No credentials stored. Register via this service first.' });
    if (!verifyPassword(password, creds.passwordHash)) {
      logAudit('AUTH_LOGIN_FAIL', { userId: user.id, action: 'login_failed', resource: 'user', ip: req.ip });
      log.warn('Failed login', { email: user.email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = createToken({ userId: user.id, role: user.role, email: user.email });
    const refreshToken = createRefreshToken(user.id);
    await eventBus.publish('user_logged_in', { userId: user.id, email: user.email });
    logAudit('AUTH_LOGIN', { userId: user.id, action: 'login', resource: 'user', ip: req.ip });
    log.info('User logged in', { userId: user.id });
    return res.json({ userId: user.id, email: user.email, token, refreshToken, displayName: user.displayName, role: user.role });
  } catch (err) {
    log.error('Login failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// POST /auth/refresh
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' });
  blacklistToken(refreshToken);
  const token = createToken({ userId: decoded.userId, role: decoded.role || 'CHILD' });
  const newRefresh = createRefreshToken(decoded.userId);
  return res.json({ token, refreshToken: newRefresh });
});

// POST /auth/validate
app.post('/auth/validate', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
  return res.json({ valid: true, userId: decoded.userId, role: decoded.role, email: decoded.email });
});

// GET /auth/health
app.get('/auth/health', (req, res) => {
  return res.json({ service: 'auth-service', status: 'healthy', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await prisma.$connect();
    await redis.connect();
    await eventBus.connect();
    await eventBus.listen();
    log.info('Connected to PostgreSQL, Redis, and EventBus');
    app.listen(PORT, () => log.info(`Auth service listening on :${PORT}`));
  } catch (err) {
    log.error('Failed to start auth service', { error: err.message });
    process.exit(1);
  }
}
start();
