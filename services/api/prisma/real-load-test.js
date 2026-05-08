const http = require('http');
const BASE = 'http://localhost:3000';
const results = { tiers: {} };
const AI_COST_PER_HINT = 0.0004;

async function request(method, path, body = null) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: 'localhost',
      port: 3000,
      path: path,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, latency: Date.now() - start, body: parsed });
      });
    });
    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTier(name, concurrency, requestsPerUser, scenario) {
  console.log(`\n--- Tier: ${name} (${concurrency} users x ${requestsPerUser} req) ---`);
  const startTime = Date.now();
  const allLatencies = [];
  let errors = 0;
  let totalCost = 0;
  let success = 0;
  let dbOps = 0;

  // Create a unique user to avoid duplicates
  const userEmail = `load-${name}-${Date.now()}@udb.local`;
  let userId;
  try {
    const reg = await request('POST', '/auth/register', {
      email: userEmail, password: 'loadtest123', displayName: `Load ${name}`, role: 'CHILD', age: 10
    });
    userId = reg.body.userId;
  } catch (e) {
    console.error(`  Failed to create user: ${e.message}`);
    return;
  }

  const loadPromises = [];
  for (let u = 0; u < concurrency; u++) {
    for (let r = 0; r < requestsPerUser; r++) {
      loadPromises.push((async () => {
        const ops = [
          // Planner request
          async () => {
            const res = await request('POST', '/planning/generate', { userId, preferences: { focusPillars: ['ACADEMIC'] } });
            if (res.status === 200) { success++; allLatencies.push(res.latency); }
            else errors++;
            return res;
          },
          // AI hint request
          async () => {
            const res = await request('POST', '/ai-lite/hint', { userId, subject: 'math', question: 'Test question ' + Math.random() });
            if (res.status === 200) { success++; allLatencies.push(res.latency); totalCost += AI_COST_PER_HINT; }
            else errors++;
            return res;
          },
          // Health check
          async () => {
            const res = await request('GET', '/monitoring/health');
            if (res.status === 200) { success++; allLatencies.push(res.latency); }
            else errors++;
            return res;
          },
          // Signals
          async () => {
            const res = await request('GET', '/monitoring/signals');
            if (res.status === 200) { success++; allLatencies.push(res.latency); }
            else errors++;
            return res;
          },
          // Budget check
          async () => {
            const res = await request('POST', '/guard/check-budget', { userId, cost: 0.0004 });
            if (res.status === 200) { success++; allLatencies.push(res.latency); }
            else errors++;
            return res;
          },
          // DB metrics (DB-backed)
          async () => {
            const res = await request('GET', '/metrics');
            if (res.status === 200) { success++; allLatencies.push(res.latency); dbOps++; }
            else errors++;
            return res;
          },
        ];
        await ops[Math.floor(Math.random() * ops.length)]();
      })());
    }
  }

  await Promise.all(loadPromises);
  const elapsed = (Date.now() - startTime) / 1000;
  allLatencies.sort((a, b) => a - b);

  const p50 = allLatencies[Math.floor(allLatencies.length * 0.5)] || 0;
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)] || 0;
  const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)] || 0;

  const tierResult = {
    concurrency,
    requestsPerUser,
    totalRequests: success + errors,
    success,
    errors,
    elapsedSeconds: elapsed.toFixed(2),
    throughput: ((success + errors) / elapsed).toFixed(2),
    latencyMs: { p50, p95, p99, min: allLatencies[0] || 0, max: allLatencies[allLatencies.length - 1] || 0 },
    estimatedCost: totalCost.toFixed(6),
    dbOperations: dbOps,
  };

  results.tiers[name] = tierResult;

  console.log(`  Requests: ${tierResult.totalRequests} | Success: ${success} | Errors: ${errors}`);
  console.log(`  Throughput: ${tierResult.throughput} req/s | Duration: ${tierResult.elapsedSeconds}s`);
  console.log(`  Latency: p50=${p50}ms p95=${p95}ms p99=${p99}ms`);
  console.log(`  Est. AI Cost: $${tierResult.estimatedCost} | DB Ops: ${dbOps}`);
}

async function main() {
  console.log('=== REAL LOAD & STRESS TEST ===');
  console.log(`Target: ${BASE} | Time: ${new Date().toISOString()}`);

  // Tiers: 10, 100, 300 users
  await runTier('10_users', 10, 5, 'standard');
  await runTier('100_users', 100, 5, 'standard');
  await runTier('300_users', 300, 5, 'standard');

  // Summary
  console.log('\n=== LOAD TEST SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));

  const overallPass = Object.values(results.tiers).every(t => t.errors === 0);
  console.log(`\nOVERALL: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('========================================');
}

main().catch(err => { console.error('Load test crashed:', err); process.exit(1); });
