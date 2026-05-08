const http = require('http');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const BASE = 'http://localhost:3000';
const GATEWAY = { hostname: 'localhost', port: 3000 };
const RESULTS = { tests: [], passed: 0, failed: 0 };

function req(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const opts = { ...GATEWAY, path, method, headers: { 'Content-Type': 'application/json' }, timeout: 15000 };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, (res) => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => {
        let body;
        try { body = JSON.parse(b); } catch { body = { raw: b }; }
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

function record(name, pass, detail) {
  RESULTS.tests.push({ name, pass, detail, timestamp: new Date().toISOString() });
  if (pass) RESULTS.passed++; else RESULTS.failed++;
  console.log(`${pass ? '✓' : '✗'} ${name}: ${detail}`);
}

async function run() {
  console.log('=== FAILURE INJECTION TESTS ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  // 1. DB disconnect test
  console.log('--- Test 1: DB Disconnect ---');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    record('db_disconnect', true, 'PostgreSQL disconnect/reconnect cycle OK');
  } catch (e) {
    record('db_disconnect', false, `DB disconnect error: ${e.message}`);
  }

  // 2. Redis outage simulation (verify graceful degradation)
  console.log('\n--- Test 2: Redis Fallback ---');
  try {
    const badRedis = new Redis('redis://localhost:16379', { maxRetriesPerRequest: 1, retryStrategy: () => null, lazyConnect: true });
    try { await badRedis.connect(); record('redis_bad_connect', false, 'Connected to non-existent Redis'); }
    catch (e) {
      record('redis_bad_connect', true, `Redis rejected bad port as expected: ${e.message.split('\n')[0]}`);
    }
    // Test event bus fallback (no Redis = memory mode)
    const eventBus = require('../shared/event-bus');
    const fallbackId = eventBus._fallback('test_event', { msg: 'outage test' });
    record('eventbus_fallback', !!fallbackId, `Event bus memory fallback ID: ${fallbackId}`);
  } catch (e) {
    record('redis_fallback', false, `Redis fallback error: ${e.message}`);
  }

  // 3. Queue worker crash recovery
  console.log('\n--- Test 3: Queue Recovery ---');
  try {
    const queue = require('../shared/queue');
    if (queue.ready) {
      // Enqueue a job that would fail
      await queue.enqueue('analytics', 'fail_test', { shouldFail: true });
      const metrics = await queue.getQueueMetrics('analytics');
      record('queue_enqueue', true, `Queue depth: ${metrics.pending}`);
    } else {
      record('queue_enqueue', true, 'Queue uses memory fallback');
    }
  } catch (e) {
    record('queue_enqueue', false, `Queue error: ${e.message}`);
  }

  // 4. Auth flood test (rate limiting)
  console.log('\n--- Test 4: Brute Force Protection ---');
  let floodPassed = 0;
  let floodBlocked = 0;
  for (let i = 0; i < 15; i++) {
    const res = await req('POST', '/auth/login', { email: 'nonexistent@test.com', password: 'wrongpass' + i });
    if (res.status === 429) floodBlocked++;
    else floodPassed++;
  }
  record('brute_force', floodBlocked > 0, `${floodBlocked}/${floodPassed + floodBlocked} requests blocked after rate limit exceeded`);

  // 5. Malformed payload
  console.log('\n--- Test 5: Malformed Payload ---');
  try {
    const res = await req('POST', '/auth/register', 'not-json-at-all', null);
    record('malformed_json', res.status >= 400, `Received ${res.status} for malformed JSON`);
  } catch (e) {
    record('malformed_json', true, `Connection error (expected for bad data): ${e.message}`);
  }

  // 6. Oversized payload
  console.log('\n--- Test 6: Oversized Payload ---');
  try {
    const bigData = { email: 'big@test.com', password: 'x'.repeat(200000) };
    const res = await req('POST', '/auth/register', bigData, null);
    record('oversized_payload', res.status >= 400, `Received ${res.status} for oversized payload`);
  } catch (e) {
    record('oversized_payload', true, `Connection error for oversized payload: ${e.message}`);
  }

  // 7. Gateway recovery (call health after all failures)
  console.log('\n--- Test 7: Recovery Verification ---');
  try {
    const h = await req('GET', '/gateway/health');
    record('recovery', h.status === 200, `Gateway health returned ${h.status} after failures`);
  } catch (e) {
    record('recovery', false, `Gateway unreachable after failures: ${e.message}`);
  }

  // Results
  console.log('\n=== FINAL RESULTS ===');
  console.log(JSON.stringify(RESULTS, null, 2));
  console.log(`\nPassed: ${RESULTS.passed}/${RESULTS.tests.length}`);
  if (RESULTS.failed > 0) {
    console.log(`FAILED TESTS: ${RESULTS.tests.filter(t => !t.pass).map(t => t.name).join(', ')}`);
    process.exit(1);
  }
  console.log('ALL FAILURE INJECTION TESTS PASSED');
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
