const { initTracing, shutdownTracing } = require('../shared/tracing');
initTracing('planner-service');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const Redis = require('ioredis');
const { createLogger, correlationId } = require('../shared/logger');
const { metricsMiddleware, metricsEndpoint, trackIdempotencyHit } = require('../shared/prometheus');
const eventBus = require('../shared/event-bus');
const queueService = require('../shared/queue');
const { idempotent } = require('../shared/idempotency');
const { savePlan, getPlan, deletePlan } = require('../shared/redis-state');

const app = express();
const PORT = process.env.PLANNER_SERVICE_PORT || 3002;
const log = createLogger('planner-service');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3, retryStrategy(t) { if (t > 3) return null; return Math.min(t * 200, 2000); }, lazyConnect: true,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(correlationId);
app.use(metricsMiddleware('planner-service'));

app.post('/planning/generate', idempotent(redis, { trackHit: trackIdempotencyHit }), async (req, res) => {
  const { userId, preferences } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (typeof userId !== 'string') return res.status(400).json({ error: 'Invalid userId type' });
  var existing = await getPlan(userId);
  if (existing) return res.json({ ...existing, cached: true });
  const plan = {
    id: require('crypto').randomUUID(),
    userId,
    generatedAt: new Date().toISOString(),
    activities: [
      { time: '08:00', type: 'academic', duration: 45, subject: 'Math' },
      { time: '09:00', type: 'biometric', duration: 30, activity: 'Exercise' },
      { time: '10:00', type: 'academic', duration: 45, subject: 'Reading' },
      { time: '14:00', type: 'social', duration: 30, activity: 'Group Work' },
    ],
    focusPillars: preferences?.focusPillars || ['ACADEMIC', 'BIOMETRIC'],
    totalFocusMinutes: 150,
  };
  plans.set(userId, plan);   await savePlan(userId, plan);
  await eventBus.publish('planner_created', { userId, planId: plan.id });
  await queueService.enqueue('analytics', 'planner_generated', { userId, planId: plan.id });
  log.info('Plan generated', { userId });
  return res.json(plan);
});

app.post('/planning/update', async (req, res) => {
  const { userId, activities } = req.body;
  if (!userId || !activities) return res.status(400).json({ error: 'userId and activities required' });
  var existing = await getPlan(userId);
  if (!existing) return res.status(404).json({ error: 'No plan found for user' });
  existing.activities = activities;
  existing.updatedAt = new Date().toISOString();
  await savePlan(userId, existing);
  await eventBus.publish('planner_updated', { userId, planId: existing.id });
  return res.json(existing);
});

app.get('/planning/:userId', async (req, res) => {
  var plan = await getPlan(req.params.userId);
  if (!plan) return res.status(404).json({ error: 'No plan found' });
  return res.json(plan);
});

app.get('/metrics', metricsEndpoint);
app.get('/planner/health', async (req, res) => {
  return res.json({ service: 'planner-service', status: 'healthy', timestamp: new Date().toISOString() });
});

async function start() {
  await redis.connect();
  await eventBus.connect();
  await queueService.connect();
  await queueService.createQueue('analytics', { retries: 3, backoff: 2000 });
  log.info('Connected to Redis');
  const server = app.listen(PORT, () => log.info(`Planner service listening on :${PORT}`));

  process.on('SIGTERM', async () => {
    log.info('SIGTERM received, shutting down gracefully');
    server.close(() => log.info('HTTP server closed'));
    if (eventBus.client) { await eventBus.client.quit(); }
    if (eventBus.subscriber) { await eventBus.subscriber.quit(); }
      if (queueService.client) { await queueService.client.quit(); }
      await shutdownTracing();
      setTimeout(() => { log.warn('Forced exit after timeout'); process.exit(0); }, 10000).unref();
  });
}
start();
