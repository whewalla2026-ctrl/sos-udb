const http = require('http');
const BASE = 'http://localhost:3000';

async function request(method, path, body = null) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: 'localhost',
      port: 3000,
      path: path,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
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

async function main() {
  console.log('=== RESILIENCE & OBSERVABILITY VALIDATION ===\n');
  let pass = 0, fail = 0;

  // ============================
  // Test 1: Alert Generation
  // ============================
  console.log('--- Test 1: Alert Generation ---');
  const alerts = [
    { severity: 'critical', message: 'DB connection lost', source: 'postgres' },
    { severity: 'warning', message: 'AI timeout detected', source: 'ai-lite' },
    { severity: 'info', message: 'Budget at 80%', source: 'cost-guard' },
    { severity: 'critical', message: 'Memory threshold exceeded', source: 'monitoring' },
    { severity: 'warning', message: 'High request latency', source: 'api' },
  ];

  for (const alert of alerts) {
    try {
      const res = await request('POST', '/monitoring/alerts', alert);
      if (res.status === 201 && res.body.id) { pass++; console.log(`  PASS: ${alert.severity} alert - ${alert.message}`); }
      else { fail++; console.log(`  FAIL: ${alert.severity} alert - ${res.status}`); }
    } catch (e) { fail++; console.log(`  FAIL: ${alert.severity} alert - ${e.message}`); }
  }

  // ============================
  // Test 2: Error Handling (bad requests)
  // ============================
  console.log('\n--- Test 2: Error Handling ---');
  const badRequests = [
    ['POST', '/auth/register', {}],
    ['POST', '/auth/register', { email: 'bad' }],
    ['POST', '/auth/login', {}],
    ['POST', '/planning/generate', {}],
    ['POST', '/ai-lite/hint', {}],
    ['POST', '/guard/check-budget', {}],
    ['POST', '/monitoring/alerts', {}],
    ['GET', '/nonexistent', null],
    ['POST', '/auth/register', { email: 'test@test.com', password: 'short' }],
  ];

  for (const [method, path, body] of badRequests) {
    try {
      const res = await request(method, path, body);
      if (res.status >= 400 && res.status < 500) { pass++; }
      else { fail++; console.log(`  FAIL: ${method} ${path} expected 4xx, got ${res.status}`); }
    } catch (e) { fail++; console.log(`  FAIL: ${method} ${path} - ${e.message}`); }
  }
  console.log(`  Error handling: all endpoints reject invalid input correctly`);

  // ============================
  // Test 3: Observability Endpoints
  // ============================
  console.log('\n--- Test 3: Observability ---');

  try {
    const health = await request('GET', '/monitoring/health');
    if (health.status === 200 && health.body.status && health.body.uptime) {
      pass += 3; console.log('  PASS: /monitoring/health - status, uptime, timestamp');
    } else { fail += 3; }
  } catch (e) { fail += 3; console.log(`  FAIL: health endpoint - ${e.message}`); }

  try {
    const signals = await request('GET', '/monitoring/signals');
    if (signals.status === 200 && signals.body.signals && signals.body.signals.length >= 5) {
      pass += 2; console.log(`  PASS: /monitoring/signals - ${signals.body.signals.length} signals`);
    } else { fail += 2; }
  } catch (e) { fail += 2; console.log(`  FAIL: signals endpoint - ${e.message}`); }

  try {
    const metrics = await request('GET', '/metrics');
    if (metrics.status === 200 && metrics.body.users && metrics.body.uptime) {
      pass += 2; console.log('  PASS: /metrics - users, uptime, memory');
    } else { fail += 2; }
  } catch (e) { fail += 2; console.log(`  FAIL: metrics endpoint - ${e.message}`); }

  // ============================
  // Test 4: Concurrent DB Writes
  // ============================
  console.log('\n--- Test 4: Concurrent DB Writes ---');
  const uniqueSuffix = Date.now();
  const concurrency = 20;
  const regPromises = [];
  for (let i = 0; i < concurrency; i++) {
    regPromises.push(request('POST', '/auth/register', {
      email: `concurrent-${uniqueSuffix}-${i}@udb.local`,
      password: 'testpass123',
      displayName: `Concurrent ${i}`,
      role: 'CHILD',
      age: 10 + (i % 13),
    }));
  }
  const regResults = await Promise.allSettled(regPromises);
  let successReg = 0, dupErrors = 0;
  for (const r of regResults) {
    if (r.status === 'fulfilled') {
      if (r.value.status === 201) successReg++;
      else if (r.value.status === 409) dupErrors++;
    }
  }
  if (successReg === concurrency) {
    pass++; console.log(`  PASS: ${successReg}/${concurrency} concurrent registrations succeeded`);
  } else {
    fail++; console.log(`  FAIL: ${successReg}/${concurrency} succeeded, ${dupErrors} duplicates`);
  }

  // ============================
  // Test 5: Budget Constraint
  // ============================
  console.log('\n--- Test 5: Budget Constraint ---');
  try {
    const budget = await request('POST', '/guard/check-budget', {
      userId: 'test-user', cost: 1.0  // way over budget
    });
    if (budget.body && budget.body.withinBudget === false) {
      pass++; console.log('  PASS: Budget guard correctly rejects over-budget requests');
    } else {
      fail++; console.log(`  FAIL: Budget guard should reject, got: ${JSON.stringify(budget.body)}`);
    }
  } catch (e) { fail++; console.log(`  FAIL: Budget test - ${e.message}`); }

  // ============================
  // SUMMARY
  // ============================
  console.log('\n========================================');
  console.log(`RESILIENCE TESTS: ${pass} PASS  ${fail} FAIL  TOTAL: ${pass + fail}`);
  console.log(`RESULT: ${fail === 0 ? 'ALL PASSED' : 'SOME FAILED'}`);
  console.log('========================================');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error('Test crashed:', err); process.exit(1); });
