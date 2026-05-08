const promClient = require('prom-client');

promClient.collectDefaultMetrics({ prefix: 'udb_', timeout: 5000 });

const httpRequestTotal = new promClient.Counter({
  name: 'udb_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status', 'service'],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'udb_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const authFailuresTotal = new promClient.Counter({
  name: 'udb_auth_failures_total',
  help: 'Total authentication failures',
  labelNames: ['reason', 'service'],
});

const queueDepth = new promClient.Gauge({
  name: 'udb_queue_depth',
  help: 'Current queue depth per queue',
  labelNames: ['queue'],
});

const queueFailuresTotal = new promClient.Counter({
  name: 'udb_queue_failures_total',
  help: 'Total queue job failures',
  labelNames: ['queue'],
});

const redisLatency = new promClient.Histogram({
  name: 'udb_redis_latency_seconds',
  help: 'Redis operation latency',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});

const dbPoolUsage = new promClient.Gauge({
  name: 'udb_db_pool_usage',
  help: 'Database connection pool usage',
  labelNames: ['state'],
});

const aiBudgetUsage = new promClient.Gauge({
  name: 'udb_ai_budget_usage',
  help: 'AI budget usage per user',
  labelNames: ['userId'],
});

function metricsMiddleware(serviceName) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestTotal.labels(req.method, req.route?.path || req.path, res.statusCode.toString(), serviceName).inc();
      httpRequestDuration.labels(req.method, req.route?.path || req.path, serviceName).observe(duration);
    });
    next();
  };
}

function trackAuthFailure(reason, serviceName) {
  authFailuresTotal.labels(reason, serviceName).inc();
}

function trackQueueDepth(queue, depth) {
  queueDepth.labels(queue).set(depth);
}

function trackQueueFailure(queue) {
  queueFailuresTotal.labels(queue).inc();
}

function trackRedisLatency(durationMs) {
  redisLatency.observe(durationMs / 1000);
}

function trackDbPool(poolActive, poolIdle, poolWaiting) {
  dbPoolUsage.labels('active').set(poolActive);
  dbPoolUsage.labels('idle').set(poolIdle);
  dbPoolUsage.labels('waiting').set(poolWaiting);
}

function trackAiBudget(userId, spent) {
  aiBudgetUsage.labels(userId).set(spent);
}

async function getMetrics() {
  return await promClient.register.metrics();
}

function metricsEndpoint(req, res) {
  getMetrics().then(metrics => {
    res.set('Content-Type', promClient.register.contentType);
    res.send(metrics);
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
}

module.exports = {
  metricsMiddleware, trackAuthFailure, trackQueueDepth, trackQueueFailure,
  trackRedisLatency, trackDbPool, trackAiBudget, getMetrics, metricsEndpoint,
  httpRequestTotal, httpRequestDuration, authFailuresTotal, queueDepth,
  queueFailuresTotal, redisLatency, dbPoolUsage, aiBudgetUsage,
};
