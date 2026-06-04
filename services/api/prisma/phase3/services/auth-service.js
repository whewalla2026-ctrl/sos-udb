const { initTracing, shutdownTracing } = require('../shared/tracing');
initTracing('auth-service');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { createLogger, correlationId } = require('../shared/logger');
const { createToken, verifyToken, blacklistToken, createRefreshToken, hashPassword, verifyPassword, sha256Hash, verifySha256, verifyCredential, argon2Hash, verifyArgon2, isArgon2Hash, ROLES, logAudit, rateLimit } = require('../shared/security');
const { metricsMiddleware, metricsEndpoint, trackAuthFailure, trackRedisLatency, trackDbPool, trackRefreshReplayRejection, trackJwtRefresh, trackRedisReconnect } = require('../shared/prometheus');
const eventBus = require('../shared/event-bus');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const log = createLogger('auth-service');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3, retryStrategy(t) { if (t > 3) return null; trackRedisReconnect('auth-service'); return Math.min(t * 200, 2000); }, lazyConnect: true,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(correlationId);
app.use(metricsMiddleware('auth-service'));

function validatePasswordStrength(password) {
  const errors = [];
  if (!password || password.length < 12) errors.push('at least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('a digit');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('a special character');
  return { valid: errors.length === 0, errors };
}

const authRateLimit = rateLimit({ windowMs: 60000, max: 30 });

app.post('/auth/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;  // Intentionally do NOT destructure role - mass assignment protection
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid)
      return res.status(400).json({ error: 'Password must contain: ' + pwCheck.errors.join(', ') });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email format' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const user = await prisma.user.create({
      data: { firebaseUid: `auth-${Date.now()}`, email, displayName: displayName || email.split('@')[0], role: 'CHILD' }
    });
    const start = Date.now();
    const passwordHash = await argon2Hash(password);
    await redis.set(`cred:${user.id}`, passwordHash);
    trackRedisLatency(Date.now() - start);
    const token = createToken({ userId: user.id, role: user.role, email: user.email, displayName: user.displayName });
    const refreshToken = createRefreshToken(user.id);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await redis.setex(`refresh:${refreshHash}`, 86400, JSON.stringify({ userId: user.id }));
    await eventBus.publish('user_created', { userId: user.id, email: user.email, role: user.role });
    logAudit('AUTH_REGISTER', { userId: user.id, action: 'register', resource: 'user', ip: req.ip });
    log.info('User registered', { userId: user.id, email: user.email });
    trackDbPool(1, 19, 0);
    return res.status(201).json({ userId: user.id, email: user.email, token, refreshToken, displayName: user.displayName, role: user.role });
  } catch (err) {
    log.error('Register failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (typeof email !== 'string' || typeof password !== 'string')
      return res.status(400).json({ error: 'Invalid input types' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      trackAuthFailure('user_not_found', 'auth-service');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const start = Date.now();
    const result = await verifyCredential(user.id, password, redis);
    trackRedisLatency(Date.now() - start);
    if (!result.matched) {
      trackAuthFailure('wrong_password', 'auth-service');
      logAudit('AUTH_LOGIN_FAIL', { userId: user.id, action: 'login_failed', resource: 'user', ip: req.ip });
      log.warn('Failed login', { email: user.email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Upgrade legacy credential to argon2id on successful login
    if (result.format !== 'argon2id') {
      const newHash = await argon2Hash(password);
      await redis.set(`cred:${user.id}`, newHash);
      if (result.format === 'scrypt') {
        await redis.del(`user:${user.id}`);
      }
      log.info('Upgraded credential format', { userId: user.id, from: result.format, to: 'argon2id' });
    }
    const token = createToken({ userId: user.id, role: user.role, email: user.email, displayName: user.displayName });
    const refreshToken = createRefreshToken(user.id);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await redis.setex(`refresh:${refreshHash}`, 86400, JSON.stringify({ userId: user.id }));
    await eventBus.publish('user_logged_in', { userId: user.id, email: user.email });
    logAudit('AUTH_LOGIN', { userId: user.id, action: 'login', resource: 'user', ip: req.ip });
    log.info('User logged in', { userId: user.id });
    return res.json({ userId: user.id, email: user.email, token, refreshToken, displayName: user.displayName, role: user.role });
  } catch (err) {
    log.error('Login failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/forgot-password', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email format' });

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return the same message regardless of whether user exists (prevents email enumeration)
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      await redis.setex(`reset:${tokenHash}`, 900, JSON.stringify({ userId: user.id, email: user.email })); // 15 min TTL
      log.info('Password reset requested', { email: user.email, userId: user.id });
      log.info(`[DEV] Reset URL: http://localhost:3030/auth/reset-password?token=${resetToken}`);
      await eventBus.publish('password_reset_requested', { userId: user.id, email: user.email });
    }
    return res.json({ message: 'If the email exists, a password reset link has been sent.' });
  } catch (err) {
    log.error('Forgot password failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/reset-password', authRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' });
    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) return res.status(400).json({ error: 'Password must contain: ' + pwCheck.errors.join(', ') });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await redis.get(`reset:${tokenHash}`);
    if (!stored) return res.status(401).json({ error: 'Invalid or expired reset token' });

    const { userId } = JSON.parse(stored);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newHash = await argon2Hash(newPassword);
    await redis.set(`cred:${userId}`, newHash);
    // Clean up legacy scrypt format if it exists
    await redis.del(`user:${userId}`);

    // Revoke ALL refresh tokens
    const refreshKeys = await redis.keys(`refresh:${userId}:*`);
    if (refreshKeys.length > 0) await redis.del(...refreshKeys);

    // Remove reset token
    await redis.del(`reset:${tokenHash}`);

    await eventBus.publish('password_reset_completed', { userId, email: user.email });
    logAudit('AUTH_RESET_PASSWORD', { userId, action: 'reset_password', resource: 'password', ip: req.ip });
    log.info('Password reset completed', { userId, revokedTokens: refreshKeys.length });

    return res.json({ message: 'Password reset successfully', revokedTokens: refreshKeys.length });
  } catch (err) {
    log.error('Reset password failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/change-password', authRateLimit, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword)
      return res.status(400).json({ error: 'email, currentPassword, and newPassword required' });
    if (typeof email !== 'string' || typeof currentPassword !== 'string' || typeof newPassword !== 'string')
      return res.status(400).json({ error: 'Invalid input types' });
    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid)
      return res.status(400).json({ error: 'Password must contain: ' + pwCheck.errors.join(', ') });
    if (currentPassword === newPassword)
      return res.status(400).json({ error: 'New password must differ from current password' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await verifyCredential(user.id, currentPassword, redis);
    if (!result.matched) {
      trackAuthFailure('wrong_password', 'auth-service');
      logAudit('AUTH_CHANGE_PASSWORD_FAIL', { userId: user.id, action: 'change_password_failed', resource: 'password', ip: req.ip });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await argon2Hash(newPassword);
    await redis.set(`cred:${user.id}`, newHash);
    // Clean up legacy scrypt format if it exists
    await redis.del(`user:${user.id}`);

    // Revoke ALL refresh tokens for this user
    const refreshKeys = await redis.keys(`refresh:${user.id}:*`);
    if (refreshKeys.length > 0) {
      await redis.del(...refreshKeys);
      log.info(`Revoked ${refreshKeys.length} refresh tokens for user ${user.id}`);
    }

    await eventBus.publish('password_changed', { userId: user.id, email: user.email });
    logAudit('AUTH_CHANGE_PASSWORD', { userId: user.id, action: 'change_password', resource: 'password', ip: req.ip });
    log.info('Password changed', { userId: user.id, revokedTokens: refreshKeys.length });

    return res.json({ message: 'Password changed successfully', revokedTokens: refreshKeys.length });
  } catch (err) {
    log.error('Change password failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const decoded = await verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' });
    // Verify token exists in Redis storage (rotation check)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const key = `refresh:${tokenHash}`;
    const stored = await redis.get(key);
    if (!stored) {
      trackRefreshReplayRejection();
      return res.status(401).json({ error: 'Refresh token revoked or already used' });
    }
    // Remove old token (rotation)
    const delResult = await redis.del(key);
    log.info('Token rotation', { deleted: delResult, userId: decoded.userId, keyPreview: key.substring(0, 40) + '...' });
    // Issue new pair
    const token = createToken({ userId: decoded.userId, role: decoded.role || 'CHILD' });
    const newRefresh = createRefreshToken(decoded.userId);
    const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    await redis.setex(`refresh:${newHash}`, 86400, JSON.stringify({ userId: decoded.userId }));
    trackJwtRefresh('success');
    logAudit('AUTH_REFRESH', { userId: decoded.userId, action: 'token_refresh', resource: 'token', ip: req.ip });
    log.info('Token refreshed', { userId: decoded.userId });
    return res.json({ token, refreshToken: newRefresh });
  } catch (err) {
    log.error('Refresh failed', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

app.post('/auth/validate', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
  return res.json({ valid: true, userId: decoded.userId, role: decoded.role, email: decoded.email });
});

app.get('/metrics', metricsEndpoint);
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
    const server = app.listen(PORT, () => log.info(`Auth service listening on :${PORT}`));

    process.on('SIGTERM', async () => {
      log.info('SIGTERM received, shutting down gracefully');
      server.close(() => log.info('HTTP server closed'));
      await prisma.$disconnect();
      await redis.quit();
      if (eventBus.client) { await eventBus.client.quit(); }
      if (eventBus.subscriber) { await eventBus.subscriber.quit(); }
      await shutdownTracing();
      setTimeout(() => { log.warn('Forced exit after timeout'); process.exit(0); }, 10000).unref();
    });
  } catch (err) {
    log.error('Failed to start auth service', { error: err.message });
    process.exit(1);
  }
}
start();
