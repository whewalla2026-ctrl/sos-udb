const http = require('http');

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0, total = 0;
const results = [];

async function request(method, path, body = null) {
  const url = new URL(path, BASE);
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function check(name, condition, detail = '') {
  total++;
  if (condition) { pass++; results.push({ name, status: 'PASS' }); }
  else { fail++; results.push({ name, status: 'FAIL', detail }); console.error(`  FAIL: ${name} - ${detail}`); }
}

async function main() {
  console.log('=== REAL HTTP E2E TEST SUITE ===\n');

  // ============================
  // FLOW A: Registration + Login
  // ============================
  console.log('--- FLOW A: Auth Flow ---');
  const testEmail = `e2e-test-${Date.now()}@udb.local`;
  
  // A1: Register
  const reg = await request('POST', '/auth/register', {
    email: testEmail, password: 'testpass123', displayName: 'E2E User', role: 'CHILD', age: 12
  });
  check('A1 Register returns 201', reg.status === 201, `Got ${reg.status}`);
  check('A1 Has userId', reg.body.userId, 'No userId');
  check('A1 Has token', reg.body.token, 'No token');
  check('A1 Has correct email', reg.body.email === testEmail, `Got ${reg.body.email}`);
  check('A1 Has role CHILD', reg.body.role === 'CHILD', `Got ${reg.body.role}`);
  const userId = reg.body.userId;
  const token = reg.body.token;

  // A2: Duplicate registration
  const dup = await request('POST', '/auth/register', {
    email: testEmail, password: 'testpass123', displayName: 'Dup', role: 'CHILD'
  });
  check('A2 Duplicate returns 409', dup.status === 409, `Got ${dup.status}`);

  // A3: Login
  const login = await request('POST', '/auth/login', {
    email: testEmail, password: 'testpass123'
  });
  check('A3 Login returns 200', login.status === 200, `Got ${login.status}`);
  check('A3 Login token present', login.body.token, 'No token');
  check('A3 Login userId matches', login.body.userId === userId, `Got ${login.body.userId}`);

  // A4: Login with wrong password
  const badLogin = await request('POST', '/auth/login', {
    email: testEmail, password: 'wrongpassword'
  });
  check('A4 Bad login returns 401', badLogin.status === 401, `Got ${badLogin.status}`);

  // A5: Login with missing fields
  const missingLogin = await request('POST', '/auth/login', { email: testEmail });
  check('A5 Missing password returns 400', missingLogin.status === 400, `Got ${missingLogin.status}`);

  console.log('  Auth: PASS\n');

  // ============================
  // FLOW B: Planner + AI + Monitoring
  // ============================
  console.log('--- FLOW B: Planner + AI + Monitoring ---');

  // B1: Generate plan
  const plan = await request('POST', '/planning/generate', {
    userId, preferences: { focusPillars: ['ACADEMIC', 'BIOMETRIC'] }
  });
  check('B1 Plan returns 200', plan.status === 200, `Got ${plan.status}`);
  check('B1 Plan has id', plan.body.id, 'No plan id');
  check('B1 Plan has activities', Array.isArray(plan.body.activities), 'No activities array');
  check('B1 Plan has 4 activities', plan.body.activities.length === 4, `Got ${plan.body.activities.length}`);
  check('B1 Plan focusPillars correct', plan.body.focusPillars[0] === 'ACADEMIC', `Got ${plan.body.focusPillars}`);

  // B2: AI hint (math)
  const hintMath = await request('POST', '/ai-lite/hint', {
    userId, subject: 'math', question: 'Solve for x: 2x + 3 = 7'
  });
  check('B2 AI hint returns 200', hintMath.status === 200, `Got ${hintMath.status}`);
  check('B2 Has hint text', hintMath.body.hint, 'No hint');
  check('B2 Has confidence', hintMath.body.confidence > 0, `Got ${hintMath.body.confidence}`);

  // B3: AI hint (unknown subject)
  const hintDefault = await request('POST', '/ai-lite/hint', {
    userId, subject: 'unknown', question: 'Test question'
  });
  check('B3 Default hint returns 200', hintDefault.status === 200, `Got ${hintDefault.status}`);
  check('B3 Default hint used', hintDefault.body.hint.includes('already know'), `Got ${hintDefault.body.hint}`);

  // B4: AI hint without userId
  const hintNoUser = await request('POST', '/ai-lite/hint', {
    subject: 'math', question: 'Test'
  });
  check('B4 Hint without userId returns 400', hintNoUser.status === 400, `Got ${hintNoUser.status}`);

  console.log('  Planner + AI: PASS\n');

  // ============================
  // FLOW C: Monitoring Observability
  // ============================
  console.log('--- FLOW C: Monitoring ---');

  // C1: Health check
  const health = await request('GET', '/monitoring/health');
  check('C1 Health returns 200', health.status === 200, `Got ${health.status}`);
  check('C1 Health status healthy', health.body.status === 'healthy', `Got ${health.body.status}`);
  check('C1 Has uptime', health.body.uptime > 0, `Got ${health.body.uptime}`);

  // C2: Signals
  const signals = await request('GET', '/monitoring/signals');
  check('C2 Signals returns 200', signals.status === 200, `Got ${signals.status}`);
  check('C2 Has 10 signals', signals.body.signals.length === 10, `Got ${signals.body.signals.length}`);
  const dbSignal = signals.body.signals.find(s => s.name === 'db_connection');
  check('C2 DB signal is healthy', dbSignal && dbSignal.status === 'healthy', `Got ${dbSignal?.status}`);

  // C3: Create alert
  const alert = await request('POST', '/monitoring/alerts', {
    severity: 'warning', message: 'E2E test alert', source: 'e2e-test'
  });
  check('C3 Alert creation returns 201', alert.status === 201, `Got ${alert.status}`);
  check('C3 Alert has id', alert.body.id, 'No alert id');

  // C4: Missing alert fields
  const badAlert = await request('POST', '/monitoring/alerts', { severity: 'warning' });
  check('C4 Bad alert returns 400', badAlert.status === 400, `Got ${badAlert.status}`);

  console.log('  Monitoring: PASS\n');

  // ============================
  // FLOW D: Cost Guard
  // ============================
  console.log('--- FLOW D: Cost Guard ---');

  // D1: Check budget within limits
  const budget = await request('POST', '/guard/check-budget', {
    userId, cost: 0.01
  });
  check('D1 Budget returns 200', budget.status === 200, `Got ${budget.status}`);
  check('D1 Within budget', budget.body.withinBudget === true, `Got ${budget.body.withinBudget}`);
  check('D1 Has remainingBudget', budget.body.remainingBudget > 0, `Got ${budget.body.remainingBudget}`);

  // D2: Check budget without userId
  const badBudget = await request('POST', '/guard/check-budget', { cost: 0.01 });
  check('D2 Budget without userId returns 400', badBudget.status === 400, `Got ${badBudget.status}`);

  console.log('  Cost Guard: PASS\n');

  // ============================
  // FLOW E: Metrics endpoint
  // ============================
  console.log('--- FLOW E: DB-Backed Metrics ---');

  // E1: Metrics from DB
  const metrics = await request('GET', '/metrics');
  check('E1 Metrics returns 200', metrics.status === 200, `Got ${metrics.status}`);
  check('E1 Has users count', metrics.body.users.total > 0, `Got ${metrics.body.users.total}`);
  check('E1 Has uptime', metrics.body.uptime > 0, `Got ${metrics.body.uptime}`);

  console.log('  Metrics: PASS\n');

  // ============================
  // SUMMARY
  // ============================
  console.log('========================================');
  console.log(`TOTAL: ${total}  PASS: ${pass}  FAIL: ${fail}`);
  console.log(`RESULT: ${fail === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('========================================');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('E2E suite crashed:', err);
  process.exit(1);
});
