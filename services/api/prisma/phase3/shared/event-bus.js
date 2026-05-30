const Redis = require('ioredis');
const crypto = require('crypto');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DLQ_PREFIX = 'dlq:';

class EventBus {
  constructor(url = REDIS_URL) {
    this.client = null;
    this.subscriber = null;
    this.url = url;
    this.ready = false;
    this.handlers = new Map();
  }

  async connect() {
    try {
      this.client = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        retryStrategy(t) { return t > 3 ? null : Math.min(t * 200, 2000); },
        lazyConnect: true,
      });
      this.subscriber = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        retryStrategy(t) { return t > 3 ? null : Math.min(t * 200, 2000); },
        lazyConnect: true,
      });
      await this.client.connect();
      await this.subscriber.connect();
      this.ready = true;
      return true;
    } catch (err) {
      console.warn('EventBus: Redis connection failed:', err.message);
      this.ready = false;
      return false;
    }
  }

  async publish(eventType, payload) {
    if (!this.ready) return this._fallback(eventType, payload);
    const event = { id: crypto.randomUUID(), eventType, payload: JSON.stringify(payload), timestamp: Date.now().toString() };
    const key = `events:${eventType}`;
    const eventJson = JSON.stringify(event);
    // Store in list for persistence (capped at 10000)
    await this.client.lpush(key, eventJson);
    await this.client.ltrim(key, 0, 9999);
    // Publish for real-time subscribers
    await this.client.publish(eventType, eventJson);
    return event.id;
  }

  async subscribe(eventType, handler) {
    if (!this.ready) return;
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, []);
    this.handlers.get(eventType).push(handler);
    await this.subscriber.subscribe(eventType);
  }

  async consume(eventType, handler, options = {}) {
    if (!this.ready) return;
    await this.subscribe(eventType, async (message) => {
      try {
        const event = JSON.parse(message);
        await handler({ ...event, payload: JSON.parse(event.payload) });
      } catch (err) {
        console.error(`EventBus: Handler failed for ${eventType}:`, err.message);
        await this._deadLetter(eventType, message, err.message);
      }
    });
  }

  async listen() {
    if (!this.ready) return;
    this.subscriber.on('message', (channel, message) => {
      const handlers = this.handlers.get(channel);
      if (handlers) handlers.forEach(h => h(message));
    });
  }

  async getRecentEvents(eventType, count = 10) {
    if (!this.ready) return [];
    const key = `events:${eventType}`;
    const events = await this.client.lrange(key, 0, count - 1);
    return events.map(e => {
      try { const parsed = JSON.parse(e); parsed.payload = JSON.parse(parsed.payload); return parsed; }
      catch { return { raw: e }; }
    });
  }

  async getEventCount(eventType) {
    if (!this.ready) return 0;
    try { return await this.client.llen(`events:${eventType}`); } catch { return 0; }
  }

  async getDeadLetterCount(eventType) {
    if (!this.ready) return 0;
    try { return await this.client.llen(`${DLQ_PREFIX}${eventType}`); } catch { return 0; }
  }

  async _deadLetter(eventType, message, error) {
    if (!this.ready) return;
    const dlqKey = `${DLQ_PREFIX}${eventType}`;
    const entry = JSON.stringify({ eventType, message, error, failedAt: Date.now() });
    await this.client.lpush(dlqKey, entry);
    await this.client.ltrim(dlqKey, 0, 999);
  }

  _fallback(eventType, payload) {
    console.log(`EventBus (memory fallback): ${eventType}`, JSON.stringify(payload).slice(0, 100));
    return `fallback-${Date.now()}`;
  }
}

module.exports = new EventBus();
