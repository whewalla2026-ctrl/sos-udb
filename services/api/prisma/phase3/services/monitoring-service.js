const express = require('express');
const { createLogger, correlationId } = require('../shared/logger');
const eventBus = require('../shared/event-bus');
const { logAudit, getAuditLog } = require('../shared/security');

const app = express();
const PORT = process.env.MONITORING_SERVICE_PORT || 3004;
const log = createLogger('monitoring-service');

app.use(express.json());
app.use(correlationId);

const alerts = [];
const signals = [
  { name: 'api_gateway', status: 'healthy', value: 1 },
  { name: 'auth_service', status: 'healthy', value: 1 },
  { name: 'planner_service', status: 'healthy', value: 1 },
  { name: 'ai_service', status: 'healthy', value: 1 },
  { name: 'monitoring_service', status: 'healthy', value: 1 },
  { name: 'redis_connected', status: 'healthy', value: 1 },
  { name: 'postgres_connected', status: 'healthy', value: 1 },
  { name: 'error_rate', status: 'healthy', value: 0.0 },
  { name: 'request_latency_p50', status: 'healthy', value: 45 },
  { name: 'request_latency_p95', status: 'healthy', value: 120 },
  { name: 'active_users', status: 'healthy', value: 0 },
  { name: 'ai_budget_used', status: 'healthy', value: 0.02 },
  { name: 'cost_per_user', status: 'healthy', value: 0.004 },
  { name: 'queue_depth', status: 'healthy', value: 0 },
  { name: 'event_bus_lag', status: 'healthy', value: 0 },
];

// GET /monitoring/health (aggregated)
app.get('/monitoring/health', async (req, res) => {
  const redisOk = eventBus.ready;
  signals[5].value = redisOk ? 1 : 0;
  signals[5].status = redisOk ? 'healthy' : 'degraded';
  return res.json({
    status: redisOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      auth: signals[1].status,
      planner: signals[2].status,
      ai: signals[3].status,
      monitoring: signals[4].status,
      redis: signals[5].status,
      postgres: signals[6].status,
    },
  });
});

// GET /monitoring/signals
app.get('/monitoring/signals', (req, res) => {
  return res.json({ signals, count: signals.length, timestamp: new Date().toISOString() });
});

// POST /monitoring/alerts
app.post('/monitoring/alerts', async (req, res) => {
  const { severity, message, source } = req.body;
  if (!severity || !message) return res.status(400).json({ error: 'severity and message required' });
  const alert = { id: require('crypto').randomUUID(), severity, message, source, timestamp: new Date().toISOString(), acknowledged: false };
  alerts.push(alert);
  await eventBus.publish('alert_triggered', { severity, message, source });
  logAudit('ALERT_CREATED', { action: 'alert_created', resource: 'alert', details: { severity, message } });
  log.warn('Alert triggered', { severity, message });
  return res.status(201).json(alert);
});

// GET /monitoring/alerts
app.get('/monitoring/alerts', (req, res) => {
  const { severity, limit = 50 } = req.query;
  let result = alerts;
  if (severity) result = result.filter(a => a.severity === severity);
  return res.json({ alerts: result.slice(-parseInt(limit)), total: result.length });
});

// GET /monitoring/events
app.get('/monitoring/events', async (req, res) => {
  const streams = ['user_created', 'user_logged_in', 'planner_created', 'planner_updated', 'hint_generated', 'budget_threshold_hit', 'alert_triggered'];
  const results = {};
  for (const s of streams) {
    results[s] = { count: await eventBus.getEventCount(s), dlq: await eventBus.getDeadLetterCount(s) };
  }
  return res.json(results);
});

// GET /audit/log
app.get('/audit/log', (req, res) => {
  const { limit, event, userId } = req.query;
  return res.json({ entries: getAuditLog({ limit: parseInt(limit) || 100, event, userId }), count: getAuditLog({ limit: parseInt(limit) || 100, event, userId }).length });
});

// GET /metrics
app.get('/metrics', (req, res) => {
  return res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    alerts: { total: alerts.length, unacknowledged: alerts.filter(a => !a.acknowledged).length },
    signals: signals.length,
    timestamp: new Date().toISOString(),
  });
});

// Update signal helper (called by gateway or other services)
app.post('/monitoring/signal', (req, res) => {
  const { name, status, value } = req.body;
  if (!name || !status) return res.status(400).json({ error: 'name and status required' });
  const signal = signals.find(s => s.name === name);
  if (signal) { signal.status = status; signal.value = value; signal.updatedAt = new Date().toISOString(); }
  return res.json({ updated: !!signal });
});

// GET /monitoring/health
app.get('/monitoring/health', (req, res) => {
  return res.json({ service: 'monitoring-service', status: 'healthy', alerts: alerts.length, timestamp: new Date().toISOString() });
});

async function start() {
  await eventBus.connect();
  log.info('Connected to Redis');
  app.listen(PORT, () => log.info(`Monitoring service listening on :${PORT}`));
}
start();
