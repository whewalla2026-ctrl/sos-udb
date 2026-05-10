const { initTracing, shutdownTracing } = require('../shared/tracing');
initTracing('monitoring-service');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createLogger, correlationId } = require('../shared/logger');
const eventBus = require('../shared/event-bus');
const { logAudit, getAuditLog } = require('../shared/security');
const { metricsMiddleware, metricsEndpoint } = require('../shared/prometheus');

const app = express();
const PORT = process.env.MONITORING_SERVICE_PORT || 3004;
const log = createLogger('monitoring-service');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(correlationId);
app.use(metricsMiddleware('monitoring-service'));

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

app.get('/monitoring/signals', (req, res) => {
  return res.json({ signals, count: signals.length, timestamp: new Date().toISOString() });
});

app.post('/monitoring/alerts', async (req, res) => {
  const { severity, message, source } = req.body;
  if (!severity || !message) return res.status(400).json({ error: 'severity and message required' });
  if (typeof severity !== 'string' || typeof message !== 'string')
    return res.status(400).json({ error: 'Invalid input types' });
  if (!['critical', 'warning', 'info'].includes(severity))
    return res.status(400).json({ error: 'severity must be critical, warning, or info' });
  const alert = { id: require('crypto').randomUUID(), severity, message, source, timestamp: new Date().toISOString(), acknowledged: false };
  alerts.push(alert);
  await eventBus.publish('alert_triggered', { severity, message, source });
  logAudit('ALERT_CREATED', { action: 'alert_created', resource: 'alert', details: { severity, message } });
  log.warn('Alert triggered', { severity, message });
  return res.status(201).json(alert);
});

app.get('/monitoring/alerts', (req, res) => {
  const { severity, limit = 50 } = req.query;
  let result = alerts;
  if (severity) result = result.filter(a => a.severity === severity);
  return res.json({ alerts: result.slice(-parseInt(limit)), total: result.length });
});

app.get('/monitoring/events', async (req, res) => {
  const streams = ['user_created', 'user_logged_in', 'planner_created', 'planner_updated', 'hint_generated', 'budget_threshold_hit', 'alert_triggered'];
  const results = {};
  for (const s of streams) {
    results[s] = { count: await eventBus.getEventCount(s), dlq: await eventBus.getDeadLetterCount(s) };
  }
  return res.json(results);
});

app.get('/audit/log', (req, res) => {
  const { limit, event, userId } = req.query;
  return res.json({ entries: getAuditLog({ limit: parseInt(limit) || 100, event, userId }), count: getAuditLog({ limit: parseInt(limit) || 100, event, userId }).length });
});

// Prometheus-format /metrics
app.get('/metrics', metricsEndpoint);

app.post('/monitoring/signal', (req, res) => {
  const { name, status, value } = req.body;
  if (!name || !status) return res.status(400).json({ error: 'name and status required' });
  const signal = signals.find(s => s.name === name);
  if (signal) { signal.status = status; signal.value = value; signal.updatedAt = new Date().toISOString(); }
  return res.json({ updated: !!signal });
});

async function start() {
  await eventBus.connect();
  log.info('Connected to Redis');
  const server = app.listen(PORT, () => log.info(`Monitoring service listening on :${PORT}`));

  process.on('SIGTERM', async () => {
    log.info('SIGTERM received, shutting down gracefully');
    server.close(() => log.info('HTTP server closed'));
    if (eventBus.client) { await eventBus.client.quit(); }
      if (eventBus.subscriber) { await eventBus.subscriber.quit(); }
      await shutdownTracing();
      setTimeout(() => { log.warn('Forced exit after timeout'); process.exit(0); }, 10000).unref();
  });
}
start();
