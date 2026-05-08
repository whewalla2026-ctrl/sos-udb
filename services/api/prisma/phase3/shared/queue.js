const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_RETRIES = parseInt(process.env.QUEUE_DEFAULT_RETRIES || '3');
const DEFAULT_BACKOFF_MS = parseInt(process.env.QUEUE_DEFAULT_BACKOFF || '1000');

class QueueService {
  constructor(url = REDIS_URL) {
    this.client = null;
    this.ready = false;
    this.workers = new Map();
    this.stats = new Map();
  }

  async connect() {
    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(t) { return t > 3 ? null : Math.min(t * 200, 2000); },
        lazyConnect: true,
      });
      await this.client.connect();
      this.ready = true;
      return true;
    } catch (err) {
      console.warn('Queue: Redis connection failed:', err.message);
      this.ready = false;
      return false;
    }
  }

  async createQueue(name, options = {}) {
    if (!this.stats.has(name)) {
      this.stats.set(name, { enqueued: 0, completed: 0, failed: 0, retries: 0, lastError: null, created: new Date().toISOString() });
    }
    return name;
  }

  async enqueue(queueName, jobName, data, options = {}) {
    if (!this.ready) return this._fallback(queueName, jobName, data);
    const key = `queue:${queueName}`;
    const job = {
      id: require('crypto').randomUUID(),
      name: jobName,
      data,
      attempts: 0,
      maxAttempts: options.retries || DEFAULT_RETRIES,
      timestamp: Date.now(),
      delay: options.delay || 0,
    };
    await this.client.rpush(key, JSON.stringify(job));
    const s = this.stats.get(queueName);
    if (s) s.enqueued++;
    return job;
  }

  async createWorker(queueName, handler, options = {}) {
    const pollInterval = options.pollIntervalMs || 500;
    const worker = setInterval(async () => {
      if (!this.ready) return;
      try {
        const key = `queue:${queueName}`;
        const jobStr = await this.client.lpop(key);
        if (!jobStr) return;
        const job = JSON.parse(jobStr);
        try {
          const start = Date.now();
          await handler(job);
          const s = this.stats.get(queueName);
          if (s) { s.completed++; s.lastLatencyMs = Date.now() - start; s.lastSuccess = new Date().toISOString(); }
        } catch (err) {
          job.attempts++;
          const s = this.stats.get(queueName);
          if (s) { s.failed++; s.lastError = err.message; }
          if (job.attempts < job.maxAttempts) {
            // Exponential backoff
            const backoff = (options.backoff || DEFAULT_BACKOFF_MS) * Math.pow(2, job.attempts - 1);
            setTimeout(() => {
              this.client.rpush(key, JSON.stringify(job)).catch(() => {});
            }, backoff);
            const s2 = this.stats.get(queueName);
            if (s2) s2.retries++;
          } else {
            // Move to dead letter
            const dlqKey = `dlq:${queueName}`;
            await this.client.lpush(dlqKey, JSON.stringify({ ...job, failedAt: Date.now(), error: err.message }));
            await this.client.ltrim(dlqKey, 0, 999);
          }
        }
      } catch (err) {
        console.error(`Queue worker error (${queueName}):`, err.message);
      }
    }, pollInterval);
    this.workers.set(queueName, worker);
    return worker;
  }

  async stopWorker(queueName) {
    const worker = this.workers.get(queueName);
    if (worker) { clearInterval(worker); this.workers.delete(queueName); }
  }

  async getQueueMetrics(name) {
    const key = `queue:${name}`;
    const dlqKey = `dlq:${name}`;
    let length = 0, dlqLength = 0;
    try {
      if (this.ready) { length = await this.client.llen(key); dlqLength = await this.client.llen(dlqKey); }
    } catch {}
    return { queue: name, pending: length, deadLetter: dlqLength, ...this.stats.get(name) };
  }

  async getAllMetrics() {
    const metrics = {};
    for (const [name] of this.stats) { metrics[name] = await this.getQueueMetrics(name); }
    return metrics;
  }

  _fallback(queueName, jobName, data) {
    console.log(`Queue (memory fallback): ${queueName}/${jobName}`);
    return { id: `fallback-${Date.now()}`, name: jobName, data };
  }
}

module.exports = new QueueService();
