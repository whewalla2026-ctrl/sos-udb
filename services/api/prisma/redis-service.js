const Redis = require('ioredis');
const crypto = require('crypto');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '300');
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '86400');
const PLAN_TTL_SECONDS = parseInt(process.env.PLAN_TTL_SECONDS || '600');

class RedisService {
  constructor(url = REDIS_URL) {
    this.client = null;
    this.url = url;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });
      await this.client.connect();
      this.connected = true;
      console.log('Connected to Redis');
      return true;
    } catch (err) {
      console.warn('Redis connection failed, running without cache:', err.message);
      this.connected = false;
      return false;
    }
  }

  async get(key) {
    if (!this.connected) return null;
    try {
      const val = await this.client.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  async set(key, value, ttlSeconds = CACHE_TTL_SECONDS) {
    if (!this.connected) return false;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return true;
    } catch {
      return false;
    }
  }

  async del(key) {
    if (!this.connected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch {
      return false;
    }
  }

  // Session management (survives server restarts)
  async saveSession(userId, sessionData) {
    return this.set(`session:${userId}`, sessionData, SESSION_TTL_SECONDS);
  }

  async getSession(userId) {
    return this.get(`session:${userId}`);
  }

  async deleteSession(userId) {
    return this.del(`session:${userId}`);
  }

  // Plan cache
  async cachePlan(userId, plan) {
    return this.set(`plan:${userId}`, plan, PLAN_TTL_SECONDS);
  }

  async getCachedPlan(userId) {
    return this.get(`plan:${userId}`);
  }

  // AI hint cache
  async cacheHint(subject, hint) {
    return this.set(`hint:${subject?.toLowerCase() || 'default'}`, hint, CACHE_TTL_SECONDS);
  }

  async getCachedHint(subject) {
    return this.get(`hint:${subject?.toLowerCase() || 'default'}`);
  }

  // Cache stats
  async getStats() {
    if (!this.connected) return { connected: false };
    try {
      const info = await this.client.info();
      const keyspace = await this.client.dbsize();
      return { connected: true, keyspace, info: info.split('\n').slice(0, 5) };
    } catch {
      return { connected: true, error: 'failed to get stats' };
    }
  }

  // Generate unique key helper
  static keyFor(prefix, ...parts) {
    return `${prefix}:${parts.filter(Boolean).join(':')}`;
  }
}

module.exports = new RedisService();
