const express = require('express');
const { createLogger, correlationId } = require('../shared/logger');
const eventBus = require('../shared/event-bus');
const queueService = require('../shared/queue');

const app = express();
const PORT = process.env.PLANNER_SERVICE_PORT || 3002;
const log = createLogger('planner-service');

app.use(express.json());
app.use(correlationId);

const plans = new Map();

// POST /planning/generate
app.post('/planning/generate', async (req, res) => {
  const { userId, preferences } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  // Check in-memory cache (Redis cache handled by gateway/global cache layer)
  if (plans.has(userId)) return res.json({ ...plans.get(userId), cached: true });
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
  plans.set(userId, plan);
  await eventBus.publish('planner_created', { userId, planId: plan.id });
  await queueService.enqueue('analytics', 'planner_generated', { userId, planId: plan.id });
  log.info('Plan generated', { userId });
  return res.json(plan);
});

// POST /planning/update
app.post('/planning/update', async (req, res) => {
  const { userId, activities } = req.body;
  if (!userId || !activities) return res.status(400).json({ error: 'userId and activities required' });
  const existing = plans.get(userId);
  if (!existing) return res.status(404).json({ error: 'No plan found for user' });
  existing.activities = activities;
  existing.updatedAt = new Date().toISOString();
  await eventBus.publish('planner_updated', { userId, planId: existing.id });
  return res.json(existing);
});

// GET /planning/:userId
app.get('/planning/:userId', (req, res) => {
  const plan = plans.get(req.params.userId);
  if (!plan) return res.status(404).json({ error: 'No plan found' });
  return res.json(plan);
});

// GET /planner/health
app.get('/planner/health', (req, res) => {
  return res.json({ service: 'planner-service', status: 'healthy', activePlans: plans.size, timestamp: new Date().toISOString() });
});

async function start() {
  await eventBus.connect();
  await queueService.connect();
  await queueService.createQueue('analytics', { retries: 3, backoff: 2000 });
  log.info('Connected to Redis');
  app.listen(PORT, () => log.info(`Planner service listening on :${PORT}`));
}
start();
