const { initTracing, shutdownTracing } = require('../shared/tracing');
initTracing('ai-service');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const Redis = require('ioredis');
const { createLogger, correlationId } = require('../shared/logger');
const { metricsMiddleware, metricsEndpoint, trackAiBudget, trackIdempotencyHit } = require('../shared/prometheus');
const eventBus = require('../shared/event-bus');
const queueService = require('../shared/queue');
const { idempotent, deduplicateJob } = require('../shared/idempotency');
const { getAiSpend, addAiSpend } = require('../shared/redis-state');

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 3003;
const log = createLogger('ai-service');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3, retryStrategy(t) { if (t > 3) return null; return Math.min(t * 200, 2000); }, lazyConnect: true,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(correlationId);
app.use(metricsMiddleware('ai-service'));

const COST_PER_HINT = parseFloat(process.env.AI_COST_PER_HINT || '0.0004');
const MONTHLY_BUDGET = parseFloat(process.env.AI_BUDGET_PER_USER_MONTHLY || '0.50');

const hints = {
  math: 'Break the problem into smaller steps. What is the first operation?',
  reading: 'Look for the main idea in the first paragraph.',
  science: 'What variables are involved in this experiment?',
  default: 'Think about what you already know about this topic.',
};

app.post('/ai-lite/hint', idempotent(redis, { trackHit: trackIdempotencyHit }), async (req, res) => {
  const { userId, subject, question } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (typeof userId !== 'string') return res.status(400).json({ error: 'Invalid userId type' });

  var spent = await getAiSpend(userId);
  if (spent + COST_PER_HINT > MONTHLY_BUDGET) {
    log.warn('Budget exceeded', { userId, spent, budget: MONTHLY_BUDGET });
    await eventBus.publish('budget_threshold_hit', { userId, spent, cost: COST_PER_HINT, budget: MONTHLY_BUDGET });
    return res.status(402).json({ error: 'AI budget exceeded', spent, budget: MONTHLY_BUDGET, withinLimit: false });
  }
  spent = await addAiSpend(userId, COST_PER_HINT);
  trackAiBudget(userId, spent);

  const hint = hints[subject?.toLowerCase()] || hints.default;
  const response = { hint, subject: subject || 'general', confidence: 0.85, generatedAt: new Date().toISOString(), cost: COST_PER_HINT, budgetRemaining: MONTHLY_BUDGET - spent };

  await eventBus.publish('hint_generated', { userId, subject, cost: COST_PER_HINT, totalSpent: spent });
  await queueService.enqueue('analytics', 'hint_generated', { userId, subject, cost: COST_PER_HINT });
  log.info('Hint generated', { userId, subject });

  return res.json(response);
});

app.post('/ai-lite/batch', async (req, res) => {
  const { userId, subjects } = req.body;
  if (!userId || !subjects?.length) return res.status(400).json({ error: 'userId and subjects array required' });
  if (typeof userId !== 'string') return res.status(400).json({ error: 'Invalid userId type' });
  const results = [];
  for (const subject of subjects.slice(0, 10)) {
    var spent = await getAiSpend(userId);
    if (spent + COST_PER_HINT > MONTHLY_BUDGET) break;
    spent = await addAiSpend(userId, COST_PER_HINT);
    const hint = hints[subject?.toLowerCase()] || hints.default;
    results.push({ subject, hint, cost: COST_PER_HINT });
    await eventBus.publish('hint_generated', { userId, subject, cost: COST_PER_HINT });
  }
  spent = await getAiSpend(userId);
  return res.json({ hints: results, totalCost: results.length * COST_PER_HINT, budgetRemaining: MONTHLY_BUDGET - spent });
});

app.get('/ai-lite/budget/:userId', async (req, res) => {
  var spent = await getAiSpend(req.params.userId);
  return res.json({ userId: req.params.userId, spent, budget: MONTHLY_BUDGET, remaining: MONTHLY_BUDGET - spent, costPerHint: COST_PER_HINT });
});

app.get('/metrics', metricsEndpoint);
app.get('/ai/health', async (req, res) => {
  return res.json({ service: 'ai-service', status: 'healthy', timestamp: new Date().toISOString() });
});

async function start() {
  await redis.connect();
  await eventBus.connect();
  await queueService.connect();
  await queueService.createQueue('analytics', { retries: 3, backoff: 2000 });
  log.info('Connected to Redis');
  const server = app.listen(PORT, () => log.info(`AI service listening on :${PORT}`));

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
