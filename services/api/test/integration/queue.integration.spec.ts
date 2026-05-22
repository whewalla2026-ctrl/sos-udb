import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

describe('Queue & Redis Integration', () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis(redisUrl);
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should connect to Redis', async () => {
    const pong = await redis.ping();
    expect(pong).toBe('PONG');
  });

  it('should set and get a key', async () => {
    await redis.set('test:integration', 'hello-udb');
    const val = await redis.get('test:integration');
    expect(val).toBe('hello-udb');
    await redis.del('test:integration');
  });

  it('should set key with expiry', async () => {
    await redis.setex('test:ttl', 10, 'expires-soon');
    const ttl = await redis.ttl('test:ttl');
    expect(ttl).toBeLessThanOrEqual(10);
    expect(ttl).toBeGreaterThan(0);
    await redis.del('test:ttl');
  });

  it('should support BullMQ-like list operations', async () => {
    await redis.lpush('test:queue', 'job1', 'job2', 'job3');
    const len = await redis.llen('test:queue');
    expect(len).toBe(3);
    const job = await redis.rpop('test:queue');
    expect(job).toBe('job1');
    await redis.del('test:queue');
  });
});
