const { initTracing, shutdownTracing } = require('./shared/tracing');
initTracing('api-gateway');

const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { createLogger, correlationId } = require('./shared/logger');
const { verifyToken, rateLimit, logAudit } = require('./shared/security');
const { metricsMiddleware, metricsEndpoint, trackRequestDrain } = require('./shared/prometheus');
const { CircuitBreaker } = require('./shared/circuit-breaker');
const eventBus = require('./shared/event-bus');
const queueService = require('./shared/queue');
const expressRateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.GATEWAY_PORT || 3000;
const log = createLogger('api-gateway');

const SERVICES = {
  auth: { host: process.env.AUTH_SERVICE_HOST || 'localhost', port: parseInt(process.env.AUTH_SERVICE_PORT || '3001') },
  planner: { host: process.env.PLANNER_SERVICE_HOST || 'localhost', port: parseInt(process.env.PLANNER_SERVICE_PORT || '3002') },
  ai: { host: process.env.AI_SERVICE_HOST || 'localhost', port: parseInt(process.env.AI_SERVICE_PORT || '3003') },
  monitoring: { host: process.env.MONITORING_SERVICE_HOST || 'localhost', port: parseInt(process.env.MONITORING_SERVICE_PORT || '3004') },
  api: { host: process.env.API_SERVICE_HOST || 'localhost', port: parseInt(process.env.API_SERVICE_PORT || '4000') },
};

const circuitBreakers = {};
for (const name of Object.keys(SERVICES)) {
  circuitBreakers[name] = new CircuitBreaker(name, { failureThreshold: 5, cooldownMs: 30000, successThreshold: 2, timeoutMs: 10000 });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", "data:"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'] }));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(correlationId);
app.use(metricsMiddleware('api-gateway'));

// Brute-force protection for auth routes (Redis-backed, shared across instances)
const { checkBruteForce, blacklistToken, getRedis } = require('./shared/redis-state');
async function bruteForceProtect(req, res, next) {
  let ip = req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  if (ip === '::1') ip = '127.0.0.1';
  try {
    const result = await checkBruteForce(ip);
    if (!result.allowed) return res.status(429).json({ error: 'Too many attempts. Try again later.', distributed: true });
  } catch (e) {
    // Fallback: permissive if Redis is down
  }
  next();
}

const globalRateLimit = rateLimit({ windowMs: 60000, max: 200 });
const authLimiter = expressRateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many auth requests, try again later' }, standardHeaders: true, legacyHeaders: false });

const apiRateLimit = rateLimit({ windowMs: 60000, max: 100 });

// Cross-tenant isolation: verify request userId matches token userId
function enforceTenantAccess(req, res, next) {
  if (req.params.userId && req.user && req.params.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Cross-tenant access denied', requested: req.params.userId, authenticated: req.user.userId });
  }
  next();
}

function proxy(targetService) {
  return async (req, res) => {
    const target = SERVICES[targetService];
    if (!target) return res.status(502).json({ error: `Service '${targetService}' not configured` });
    const cb = circuitBreakers[targetService];
    const path = req.originalUrl;
    const extraHeaders = { 'x-correlation-id': req.correlationId, 'x-forwarded-for': req.ip };
    if (req.user) extraHeaders['x-user-id'] = req.user.userId;
    const forwardedHeaders = { ...req.headers, ...extraHeaders };
    // Recompute content-length when re-serializing the body
    delete forwardedHeaders['content-length'];
    delete forwardedHeaders['host'];
    delete forwardedHeaders['connection'];
    delete forwardedHeaders['transfer-encoding'];
    const bodyStr = (req.body !== undefined && req.body !== null)
      ? JSON.stringify(req.body)
      : null;
    if (bodyStr && bodyStr !== '{}') {
      forwardedHeaders['content-type'] = 'application/json';
      forwardedHeaders['content-length'] = Buffer.byteLength(bodyStr).toString();
    }
    const opts = {
      hostname: target.host,
      port: target.port,
      path,
      method: req.method,
      headers: forwardedHeaders,
      timeout: 10000,
    };
    const start = Date.now();

    try {
      const result = await cb.call(() => new Promise((resolve, reject) => {
        const proxyReq = http.request(opts, (proxyRes) => {
          let body = '';
          proxyRes.on('data', c => body += c);
          proxyRes.on('end', () => {
            const duration = Date.now() - start;
            log.info('Request proxied', { method: req.method, path, statusCode: proxyRes.statusCode, duration_ms: duration });
            if (proxyRes.statusCode >= 500) {
              reject(new Error(`Upstream ${proxyRes.statusCode}: ${body.slice(0, 200)}`));
              return;
            }
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(c => {
                if (!c.includes('Secure')) c += '; Secure';
                if (!c.includes('HttpOnly')) c += '; HttpOnly';
                if (!c.includes('SameSite')) c += '; SameSite=Strict';
                return c;
              });
            }
            res.status(proxyRes.statusCode).set(proxyRes.headers).send(body);
            resolve();
          });
        });
        proxyReq.on('error', reject);
        if (bodyStr) proxyReq.write(bodyStr);
        proxyReq.end();
      }));
    } catch (err) {
      const duration = Date.now() - start;
      log.error('Proxy error', { target: targetService, path, error: err.message, circuitState: cb.getState(), duration_ms: duration });
      if (err.name === 'CircuitBreakerOpenError') {
        return res.status(503).json({ error: `Service '${targetService}' temporarily unavailable`, circuitState: 'OPEN', retryAfterMs: cb.cooldownMs });
      }
      return res.status(502).json({ error: `Service '${targetService}' unavailable`, detail: err.message });
    }
  };
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header required' });
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const decoded = await verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = decoded;
  next();
}

// --- Routes ---

// Auth routes (unauthenticated)
app.post('/auth/register', bruteForceProtect, globalRateLimit, authLimiter, proxy('auth'));
app.post('/auth/login', bruteForceProtect, globalRateLimit, authLimiter, proxy('auth'));
app.post('/auth/refresh', globalRateLimit, proxy('auth'));
app.post('/auth/validate', globalRateLimit, proxy('auth'));
app.post('/auth/forgot-password', globalRateLimit, proxy('auth'));
app.post('/auth/reset-password', globalRateLimit, proxy('auth'));
app.post('/auth/change-password', globalRateLimit, proxy('auth'));

// Auth routes (authenticated)
app.get('/auth/me', requireAuth, (req, res) => res.json(req.user));

app.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      await blacklistToken(token);
    }
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === 'string') {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const redis = await getRedis();
      await redis.del(`refresh:${hash}`);
    }
    logAudit('AUTH_LOGOUT', { userId: req.user?.userId, action: 'logout', resource: 'session', ip: req.ip });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed', detail: err.message });
  }
});

// Planner routes
app.post('/planning/generate', requireAuth, apiRateLimit, proxy('planner'));
app.post('/planning/update', requireAuth, apiRateLimit, proxy('planner'));
app.get('/planning/:userId', requireAuth, enforceTenantAccess, apiRateLimit, proxy('planner'));

// AI routes
app.post('/ai-lite/hint', requireAuth, apiRateLimit, proxy('ai'));
app.post('/ai-lite/batch', requireAuth, apiRateLimit, proxy('ai'));
app.get('/ai-lite/budget/:userId', requireAuth, enforceTenantAccess, apiRateLimit, proxy('ai'));

// Monitoring routes
app.get('/monitoring/health', proxy('monitoring'));
app.get('/monitoring/signals', requireAuth, apiRateLimit, proxy('monitoring'));
app.post('/monitoring/alerts', requireAuth, apiRateLimit, proxy('monitoring'));
app.get('/monitoring/alerts', requireAuth, apiRateLimit, proxy('monitoring'));
app.get('/monitoring/events', requireAuth, apiRateLimit, proxy('monitoring'));
app.post('/monitoring/signal', requireAuth, apiRateLimit, proxy('monitoring'));

// Audit routes
app.get('/audit/log', requireAuth, apiRateLimit, (req, res, next) => {
  const { hasRole } = require('./shared/security');
  if (!req.user || !hasRole(req.user.role, 'ADMIN')) return res.status(403).json({ error: 'Insufficient permissions', required: 'ADMIN', userRole: req.user?.role });
  next();
}, proxy('monitoring'));

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Gateway health
app.get('/gateway/health', (req, res) => {
  return res.json({ service: 'api-gateway', status: 'healthy', uptime: process.uptime(), routes: Object.keys(SERVICES), timestamp: new Date().toISOString() });
});

// Gateway routes
app.get('/gateway/routes', (req, res) => {
  return res.json({ services: SERVICES, routes: ['/auth/*', '/planning/*', '/ai-lite/*', '/monitoring/*', '/audit/*', '/metrics', '/gateway/*'] });
});

// Circuit breaker status
app.get('/gateway/circuit-breakers', (req, res) => {
  const stats = {};
  for (const [name, cb] of Object.entries(circuitBreakers)) {
    stats[name] = cb.getMetrics();
  }
  return res.json({ circuitBreakers: stats, timestamp: new Date().toISOString() });
});

app.post('/gateway/circuit-breakers/:name/reset', (req, res) => {
  const cb = circuitBreakers[req.params.name];
  if (!cb) return res.status(404).json({ error: `Circuit breaker '${req.params.name}' not found` });
  cb.reset();
  return res.json({ message: `Circuit breaker '${req.params.name}' reset to CLOSED`, state: cb.getState() });
});

// GraphQL (proxied to NestJS API)
app.all('/graphql', requireAuth, proxy('api'));

// Service health endpoints
app.get('/auth/health', proxy('auth'));
app.get('/planner/health', proxy('planner'));
app.get('/ai/health', proxy('ai'));

async function start() {
  await eventBus.connect();

  // Create queues and workers
  await queueService.connect();
  await queueService.createQueue('ai-hints', { retries: 3, backoff: 2000 });
  await queueService.createQueue('analytics', { retries: 3, backoff: 2000 });
  await queueService.createQueue('notifications', { retries: 5, backoff: 5000 });
  await queueService.createQueue('cleanup', { retries: 2, backoff: 10000 });

  await queueService.createWorker('analytics', async (job) => {
    log.info('Processing analytics job', { jobId: job.id, name: job.name, data: JSON.stringify(job.data).slice(0, 200) });
  }, { pollIntervalMs: 1000 });

  await queueService.createWorker('notifications', async (job) => {
    log.info('Processing notification job', { jobId: job.id, name: job.name, data: JSON.stringify(job.data).slice(0, 200) });
  }, { pollIntervalMs: 1500 });

  await queueService.createWorker('cleanup', async (job) => {
    log.info('Processing cleanup job', { jobId: job.id, name: job.name });
  }, { pollIntervalMs: 5000 });

  // Event consumers
  await eventBus.consume('user_created', async (event) => {
    log.info('Event: user_created', { userId: event.payload.userId });
    await queueService.enqueue('analytics', 'user_created_analytics', event.payload);
    await queueService.enqueue('notifications', 'welcome_email', { email: event.payload.email, userId: event.payload.userId });
  });

  await eventBus.consume('budget_threshold_hit', async (event) => {
    log.warn('Event: budget_threshold_hit', { userId: event.payload.userId, spent: event.payload.spent });
    await queueService.enqueue('notifications', 'budget_warning', event.payload);
  });

  await eventBus.consume('hint_generated', async (event) => {
    await queueService.enqueue('analytics', 'hint_analytics', event.payload);
  });

  await eventBus.listen();
  log.info('Gateway started', { services: Object.keys(SERVICES) });
  const server = app.listen(PORT, () => log.info(`API Gateway listening on :${PORT}`));

  process.on('SIGTERM', async () => {
    const drainStart = Date.now();
    log.info('SIGTERM received, draining active requests');
    server.close(() => {
      const drainDuration = (Date.now() - drainStart) / 1000;
      trackRequestDrain(drainDuration);
      log.info('HTTP server closed', { drainDurationMs: Date.now() - drainStart });
    });
    if (eventBus.client) { await eventBus.client.quit(); }
    if (eventBus.subscriber) { await eventBus.subscriber.quit(); }
    if (queueService.client) { await queueService.client.quit(); }
    await shutdownTracing();
    setTimeout(() => { log.warn('Forced exit after timeout', { drainDurationMs: Date.now() - drainStart }); process.exit(0); }, 10000).unref();
  });
}
start();
