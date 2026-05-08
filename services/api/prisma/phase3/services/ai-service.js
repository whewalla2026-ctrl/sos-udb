const express = require('express');
const { createLogger, correlationId } = require('../shared/logger');
const eventBus = require('../shared/event-bus');
const queueService = require('../shared/queue');

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 3003;
const log = createLogger('ai-service');

app.use(express.json());
app.use(correlationId);

const COST_PER_HINT = parseFloat(process.env.AI_COST_PER_HINT || '0.0004');
const MONTHLY_BUDGET = parseFloat(process.env.AI_BUDGET_PER_USER_MONTHLY || '0.50');
const userSpend = new Map();

const hints = {
  math: 'Break the problem into smaller steps. What is the first operation?',
  reading: 'Look for the main idea in the first paragraph.',
  science: 'What variables are involved in this experiment?',
  default: 'Think about what you already know about this topic.',
};

// POST /ai-lite/hint
app.post('/ai-lite/hint', async (req, res) => {
  const { userId, subject, question } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Budget check
  const spent = userSpend.get(userId) || 0;
  if (spent + COST_PER_HINT > MONTHLY_BUDGET) {
    log.warn('Budget exceeded', { userId, spent, budget: MONTHLY_BUDGET });
    await eventBus.publish('budget_threshold_hit', { userId, spent, cost: COST_PER_HINT, budget: MONTHLY_BUDGET });
    return res.status(402).json({ error: 'AI budget exceeded', spent, budget: MONTHLY_BUDGET, withinLimit: false });
  }
  userSpend.set(userId, spent + COST_PER_HINT);

  const hint = hints[subject?.toLowerCase()] || hints.default;
  const response = { hint, subject: subject || 'general', confidence: 0.85, generatedAt: new Date().toISOString(), cost: COST_PER_HINT, budgetRemaining: MONTHLY_BUDGET - (spent + COST_PER_HINT) };

  await eventBus.publish('hint_generated', { userId, subject, cost: COST_PER_HINT, totalSpent: spent + COST_PER_HINT });
  await queueService.enqueue('analytics', 'hint_generated', { userId, subject, cost: COST_PER_HINT });
  log.info('Hint generated', { userId, subject });

  return res.json(response);
});

// POST /ai-lite/batch
app.post('/ai-lite/batch', async (req, res) => {
  const { userId, subjects } = req.body;
  if (!userId || !subjects?.length) return res.status(400).json({ error: 'userId and subjects array required' });
  const results = [];
  for (const subject of subjects.slice(0, 10)) {
    const spent = userSpend.get(userId) || 0;
    if (spent + COST_PER_HINT > MONTHLY_BUDGET) break;
    userSpend.set(userId, spent + COST_PER_HINT);
    const hint = hints[subject?.toLowerCase()] || hints.default;
    results.push({ subject, hint, cost: COST_PER_HINT });
    await eventBus.publish('hint_generated', { userId, subject, cost: COST_PER_HINT });
  }
  return res.json({ hints: results, totalCost: results.length * COST_PER_HINT, budgetRemaining: MONTHLY_BUDGET - (userSpend.get(userId) || 0) });
});

// GET /ai-lite/budget/:userId
app.get('/ai-lite/budget/:userId', (req, res) => {
  const spent = userSpend.get(req.params.userId) || 0;
  return res.json({ userId: req.params.userId, spent, budget: MONTHLY_BUDGET, remaining: MONTHLY_BUDGET - spent, costPerHint: COST_PER_HINT });
});

// GET /ai/health
app.get('/ai/health', (req, res) => {
  return res.json({ service: 'ai-service', status: 'healthy', activeUsers: userSpend.size, timestamp: new Date().toISOString() });
});

async function start() {
  await eventBus.connect();
  await queueService.connect();
  await queueService.createQueue('analytics', { retries: 3, backoff: 2000 });
  log.info('Connected to Redis');
  app.listen(PORT, () => log.info(`AI service listening on :${PORT}`));
}
start();
