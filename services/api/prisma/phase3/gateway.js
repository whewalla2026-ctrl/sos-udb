const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { createLogger, correlationId } = require('./shared/logger');
const { verifyToken, rateLimit, logAudit } = require('./shared/security');
const { metricsMiddleware, metricsEndpoint } = require('./shared/prometheus');
const eventBus = require('./shared/event-bus');
const queueService = require('./shared/queue');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;
const log = createLogger('api-gateway');

const SERVICES = {
  auth: { host: 'localhost', port: parseInt(process.env.AUTH_SERVICE_PORT || '3001') },
  planner: { host: 'localhost', port: parseInt(process.env.PLANNER_SERVICE_PORT || '3002') },
  ai: { host: 'localhost', port: parseInt(process.env.AI_SERVICE_PORT || '3003') },
  monitoring: { host: 'localhost', port: parseInt(process.env.MONITORING_SERVICE_PORT || '3004') },
};

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

// Brute-force protection for auth routes
const authIpTracker = new Map();
function bruteForceProtect(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = `${ip}:${minute}`;
  const count = (authIpTracker.get(key) || 0) + 1;
  authIpTracker.set(key, count);
  if (count > 10) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  setTimeout(() => authIpTracker.delete(key), 120000);
  next();
}

const globalRateLimit = rateLimit({ windowMs: 60000, max: 200 });

function proxy(targetService) {
  return (req, res) => {
    const target = SERVICES[targetService];
    if (!target) return res.status(502).json({ error: `Service '${targetService}' not configured` });
    const path = req.originalUrl;
    const opts = {
      hostname: target.host,
      port: target.port,
      path,
      method: req.method,
      headers: { ...req.headers, 'x-correlation-id': req.correlationId, 'x-forwarded-for': req.ip },
      timeout: 10000,
    };
    const start = Date.now();
    const proxyReq = http.request(opts, (proxyRes) => {
      let body = '';
      proxyRes.on('data', c => body += c);
      proxyRes.on('end', () => {
        const duration = Date.now() - start;
        log.info('Request proxied', { method: req.method, path, statusCode: proxyRes.statusCode, duration_ms: duration });
        // Secure cookies
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
      });
    });
    proxyReq.on('error', (err) => {
      log.error('Proxy error', { target: targetService, path, error: err.message });
      res.status(502).json({ error: `Service '${targetService}' unavailable`, detail: err.message });
    });
    if (Object.keys(req.body || {}).length > 0) proxyReq.write(JSON.stringify(req.body));
    proxyReq.end();
  };
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header required' });
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = decoded;
  next();
}

// --- Routes ---

// Auth routes (unauthenticated)
app.post('/auth/register', bruteForceProtect, globalRateLimit, proxy('auth'));
app.post('/auth/login', bruteForceProtect, globalRateLimit, proxy('auth'));
app.post('/auth/refresh', proxy('auth'));
app.post('/auth/validate', proxy('auth'));

// Auth routes (authenticated)
app.get('/auth/me', requireAuth, (req, res) => res.json(req.user));

// Planner routes
app.post('/planning/generate', requireAuth, proxy('planner'));
app.post('/planning/update', requireAuth, proxy('planner'));
app.get('/planning/:userId', requireAuth, proxy('planner'));

// AI routes
app.post('/ai-lite/hint', requireAuth, proxy('ai'));
app.post('/ai-lite/batch', requireAuth, proxy('ai'));
app.get('/ai-lite/budget/:userId', requireAuth, proxy('ai'));

// Monitoring routes
app.get('/monitoring/health', proxy('monitoring'));
app.get('/monitoring/signals', requireAuth, proxy('monitoring'));
app.post('/monitoring/alerts', requireAuth, proxy('monitoring'));
app.get('/monitoring/alerts', requireAuth, proxy('monitoring'));
app.get('/monitoring/events', requireAuth, proxy('monitoring'));
app.post('/monitoring/signal', requireAuth, proxy('monitoring'));

// Audit routes
app.get('/audit/log', requireAuth, (req, res, next) => {
  const { ROLES } = require('./shared/security');
  const userRole = ROLES[req.user?.role];
  if (!userRole || userRole < ROLES.ADMIN) return res.status(403).json({ error: 'Insufficient permissions' });
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
  app.listen(PORT, () => log.info(`API Gateway listening on :${PORT}`));
}
start();
