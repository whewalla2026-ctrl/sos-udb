const http = require('http');

const BASE = 'http://localhost:3000';
const USERS = 100;
const REQUESTS_PER_USER = 10;
const RUNS = 3;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 10000,
    };
    const start = Date.now();
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const rtt = Date.now() - start;
        try { resolve({ status: res.statusCode, rtt, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, rtt, body: { raw: body } }); }
      });
    });
    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    http.get(`${BASE}${path}`, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, rtt: Date.now() - start, body: JSON.parse(body) }));
    }).on('error', e => reject(e));
  });
}

async function warmup() {
  await post('/auth/register', { email: 'load@test.com', password: 'testpass123', displayName: 'Load' });
}

async function runScenario(label, fn, iterations) {
  const latencies = [];
  let errors = 0;
  let cacheHits = 0;
  for (let i = 0; i < iterations; i++) {
    try {
      const result = await fn(i);
      latencies.push(result.rtt);
      if (result.status >= 500) errors++;
      if (result.body && result.body.cached) cacheHits++;
    } catch (e) {
      errors++;
    }
  }
  latencies.sort((a, b) => a - b);
  const total = latencies.length;
  return {
    label,
    total_requests: total,
    errors,
    cache_hits: cacheHits,
    min_ms: latencies[0] || 0,
    p50_ms: latencies[Math.floor(total * 0.5)] || 0,
    p95_ms: latencies[Math.floor(total * 0.95)] || 0,
    p99_ms: latencies[Math.floor(total * 0.99)] || 0,
    max_ms: latencies[total - 1] || 0,
  };
}

async function main() {
  console.log('Phase 3 - Redis Cache Load Test');
  console.log('===============================');

  await warmup();
  console.log('Warmup complete\n');

  const results = [];

  // Scenario 1: Uncached plan generation (unique userIds)
  results.push(await runScenario('Plan (uncached)', (i) =>
    post('/planning/generate', { userId: `uncached-${i}` }), USERS));

  // Scenario 2: Cached plan generation (same userId)
  results.push(await runScenario('Plan (cached)', () =>
    post('/planning/generate', { userId: 'load-test-user' }), REQUESTS_PER_USER * USERS));

  // Scenario 3: Uncached AI hints (unique subject)
  const subjects = ['math', 'reading', 'science', 'history', 'art', 'music', 'geography', 'physics', 'chemistry', 'biology'];
  results.push(await runScenario('AI Hint (uncached)', (i) =>
    post('/ai-lite/hint', { userId: 'load-test-user', subject: subjects[i % subjects.length] }), USERS));

  // Scenario 4: Cached AI hints (same subject)
  results.push(await runScenario('AI Hint (cached)', () =>
    post('/ai-lite/hint', { userId: 'load-test-user', subject: 'math' }), REQUESTS_PER_USER * USERS));

  // Scenario 5: Health (uncacheable, always live)
  results.push(await runScenario('Health', () => get('/monitoring/health'), USERS));

  // Scenario 6: Mixed workload
  const mixedStart = Date.now();
  let mixedErrors = 0;
  let mixedCount = 0;
  for (let i = 0; i < USERS; i++) {
    try {
      await post('/planning/generate', { userId: `mixed-${i}` });
      await post('/ai-lite/hint', { userId: `mixed-${i}`, subject: 'math' });
      await get('/monitoring/health');
      mixedCount += 3;
    } catch { mixedErrors++; }
  }
  const mixedDuration = Date.now() - mixedStart;
  results.push({
    label: 'Mixed (plan + hint + health)',
    total_requests: mixedCount,
    errors: mixedErrors,
    cache_hits: '-',
    min_ms: '-',
    p50_ms: '-',
    p95_ms: '-',
    p99_ms: '-',
    max_ms: '-',
    duration_ms: mixedDuration,
    throughput: Math.round(mixedCount / (mixedDuration / 1000)),
  });

  // Summary
  console.log('\nResults:\n');
  console.log(JSON.stringify(results, null, 2));

  const totalReqs = results.reduce((s, r) => s + r.total_requests, 0);
  const totalErrors = results.reduce((s, r) => s + (r.errors || 0), 0);
  const totalCacheHits = results.reduce((s, r) => s + (r.cache_hits === '-' ? 0 : r.cache_hits), 0);

  console.log(`\n---\nTotal: ${totalReqs} requests, ${totalErrors} errors, ${totalCacheHits} cache hits`);
  console.log(`Verdict: ${totalErrors === 0 ? 'PASS' : 'FAIL'}`);
}

main().catch(console.error);
