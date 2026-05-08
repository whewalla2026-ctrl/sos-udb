const http = require('http');

const BASE = 'http://localhost:3000';
const RUNS = 3;

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 10000,
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const start = Date.now();
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, rtt: Date.now() - start, body: safeParse(b) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const opts = { hostname: 'localhost', port: 3000, path, method: 'GET', timeout: 10000 };
    if (token) opts.headers = { 'Authorization': `Bearer ${token}` };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, rtt: Date.now() - start, body: safeParse(b) }));
    });
    req.on('error', reject);
    req.end();
  });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return { raw: s }; } }

async function loadTest(label, fn, count) {
  const latencies = [];
  let errors = 0, cacheHits = 0;
  for (let i = 0; i < count; i++) {
    try {
      const r = await fn(i);
      latencies.push(r.rtt);
      if (r.status === 0 || r.status >= 500) errors++;
      if (r.body && r.body.cached) cacheHits++;
    } catch (e) { errors++; }
  }
  latencies.sort((a, b) => a - b);
  const total = latencies.length;
  return {
    label, total_requests: total, errors, cache_hits: cacheHits,
    min_ms: latencies[0] || 0, p50_ms: latencies[Math.floor(total * 0.5)] || 0,
    p95_ms: latencies[Math.floor(total * 0.95)] || 0, p99_ms: latencies[Math.floor(total * 0.99)] || 0, max_ms: latencies[total - 1] || 0,
  };
}

async function main() {
  console.log('Phase 3 - Microservices Load Test');
  console.log('==================================');

  // Register a test user for auth tests
  const registerBody = JSON.stringify({ email: 'loadtest@test.com', password: 'testpass123', displayName: 'Load Test' });
  const token = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path: '/auth/register', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(registerBody) } }, (res) => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b).token));
    });
    req.on('error', reject);
    req.write(registerBody);
    req.end();
  });
  console.log('Warmup complete, token acquired\n');

  const results = [];

  // Scenario 1: Health check (no auth)
  results.push(await loadTest('Health', () => get('/monitoring/health'), 100));

  // Scenario 2: Auth - login (with rate limiting)
  const loginBody = JSON.stringify({ email: 'loadtest@test.com', password: 'testpass123' });
  results.push(await loadTest('Login', () => post('/auth/login', { email: 'loadtest@test.com', password: 'testpass123' }), 30));

  // Scenario 3: Plan generation (uncached - different users)
  results.push(await loadTest('Plan (uncached)', (i) => post('/planning/generate', { userId: `load-${i}` }, token), 100));

  // Scenario 4: Plan generation (cached - same user)
  results.push(await loadTest('Plan (cached)', () => post('/planning/generate', { userId: 'load-cached' }, token), 500));

  // Scenario 5: AI hint
  results.push(await loadTest('AI Hint', () => post('/ai-lite/hint', { userId: 'load-test', subject: 'math' }, token), 200));

  // Scenario 6: Mixed throughput
  const mixedStart = Date.now();
  let mixedErrors = 0, mixedCount = 0;
  for (let i = 0; i < 50; i++) {
    try { await get('/monitoring/health', token); mixedCount++; } catch { mixedErrors++; }
    try { await get('/monitoring/signals', token); mixedCount++; } catch { mixedErrors++; }
    try { await post('/planning/generate', { userId: `mixed-${i}` }, token); mixedCount++; } catch { mixedErrors++; }
  }
  const mixedDuration = Date.now() - mixedStart;
  results.push({
    label: 'Mixed (health+signals+plan)',
    total_requests: mixedCount, errors: mixedErrors, cache_hits: '-', min_ms: '-', p50_ms: '-',
    p95_ms: '-', p99_ms: '-', max_ms: '-', duration_ms: mixedDuration, throughput_rps: Math.round(mixedCount / (mixedDuration / 1000)),
  });

  console.log(JSON.stringify(results, null, 2));
  const totalReqs = results.reduce((s, r) => s + r.total_requests, 0);
  const totalErrors = results.reduce((s, r) => s + (r.errors || 0), 0);
  const totalCacheHits = results.reduce((s, r) => s + (r.cache_hits === '-' ? 0 : r.cache_hits), 0);
  console.log(`\nTotal: ${totalReqs} requests, ${totalErrors} errors, ${totalCacheHits} cache hits`);
  console.log(`Verdict: ${totalErrors === 0 ? 'PASS' : 'FAIL'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
