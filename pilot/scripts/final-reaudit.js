const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

var EVIDENCE = [];

function check(name, weight, fn) {
  return Promise.resolve(fn()).then(function(result) {
    EVIDENCE.push({ check: name, weight, pass: result.pass, detail: result.detail || 'OK' });
    process.stdout.write((result.pass ? '  ✅' : '  ❌') + ' ' + name + ' +' + (result.pass ? weight : 0) + '\n');
    return result;
  }).catch(function(err) {
    EVIDENCE.push({ check: name, weight, pass: false, detail: err.message });
    process.stdout.write('  ❌ ' + name + ' +0 [' + err.message + ']\n');
    return { pass: false };
  });
}

function fetch(method, url, data, headers) {
  return new Promise(function(resolve, reject) {
    var urlObj = new URL(url);
    var opts = {
      hostname: urlObj.hostname, port: urlObj.port, path: urlObj.pathname + urlObj.search,
      method: method || 'GET', timeout: 10000,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    };
    var req = http.request(opts, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        var parsed = null;
        try { parsed = JSON.parse(body); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: body, json: parsed });
      });
    });
    req.on('error', reject);
    req.on('timeout', function() { req.destroy(); reject(new Error('Timeout')); });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

var TOKEN = null;
var USER_EMAIL = 'audit-' + Date.now() + '@test.com';
var USER_PASSWORD = 'AuditPass123!';

async function run() {
  console.log('\n=== FINAL INDEPENDENT RE-AUDIT ===\n');
  var startTime = Date.now();

  // ── 1. Service Availability ──
  await check('Gateway is healthy', 5, async function() {
    var r = await fetch('GET', 'http://localhost:3000/gateway/health');
    return { pass: r.json && r.json.status === 'healthy', detail: r.json ? r.json.status : r.body.slice(0,100) };
  });

  await check('Auth service is healthy', 5, async function() {
    var r = await fetch('GET', 'http://localhost:3000/auth/health');
    return { pass: r.json && r.json.status === 'healthy', detail: r.json ? r.json.status : r.body.slice(0,100) };
  });

  await check('NestJS GraphQL is running', 5, async function() {
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { __typename }' });
    return { pass: r.status === 200, detail: 'HTTP ' + r.status };
  });

  // ── 2. Authentication ──
  await check('User registration works', 5, async function() {
    var r = await fetch('POST', 'http://localhost:3000/auth/register', { email: USER_EMAIL, password: USER_PASSWORD });
    if (r.json && r.json.token) TOKEN = r.json.token;
    return { pass: r.json && r.json.token, detail: r.json ? (r.json.email || r.json.error) : r.body.slice(0,100) };
  });

  await check('Login works', 5, async function() {
    var r = await fetch('POST', 'http://localhost:3000/auth/login', { email: USER_EMAIL, password: USER_PASSWORD });
    if (r.json && r.json.token) TOKEN = r.json.token;
    return { pass: r.json && r.json.token, detail: r.json ? (r.json.email || r.json.error) : r.body.slice(0,100) };
  });

  await check('Invalid login rejected', 3, async function() {
    var r = await fetch('POST', 'http://localhost:3000/auth/login', { email: USER_EMAIL, password: 'wrongpassword123' });
    return { pass: r.status === 401, detail: r.json ? (r.json.error || r.body.slice(0,100)) : 'status ' + r.status };
  });

  // ── 3. Security Fixes ──
  await check('Mass assignment: role hardcoded to CHILD', 10, async function() {
    var r = await fetch('POST', 'http://localhost:3000/auth/register', { email: 'admin-attempt-' + Date.now() + '@test.com', password: 'TestPass123!', role: 'ADMIN' });
    return { pass: r.json && r.json.role === 'CHILD', detail: r.json ? 'role=' + r.json.role : r.body.slice(0,100) };
  });

  await check('GraphQL me query returns data (JWT sub fix)', 10, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token available' };
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { me { id email displayName role } }' }, { Authorization: 'Bearer ' + TOKEN });
    return { pass: r.json && r.json.data && r.json.data.me, detail: r.json ? JSON.stringify(r.json.data || r.json.errors).slice(0,200) : r.body.slice(0,100) };
  });

  // ── 4. Password Reset ──
  await check('Forgot password endpoint works', 8, async function() {
    var r = await fetch('POST', 'http://localhost:3000/auth/forgot-password', { email: USER_EMAIL });
    return { pass: r.json && r.json.message, detail: r.json ? r.json.message : r.body.slice(0,100) };
  });

  await check('Reset password with valid token works', 10, async function() {
    var redis = new Redis('redis://localhost:6379');
    var userKeys = await redis.keys('user:*');
    var userId = null;
    for (var key of userKeys) {
      var data = await redis.hgetall(key);
      if (data.email === USER_EMAIL) { userId = key.replace('user:', ''); break; }
    }
    await redis.quit();
    if (!userId) return { pass: false, detail: 'User not found in Redis' };

    var token = crypto.randomBytes(32).toString('hex');
    var hash = crypto.createHash('sha256').update(token).digest('hex');
    var redis2 = new Redis('redis://localhost:6379');
    await redis2.setex('reset:' + hash, 900, JSON.stringify({ userId: userId, email: USER_EMAIL }));
    await redis2.quit();

    var r = await fetch('POST', 'http://localhost:3000/auth/reset-password', { token: token, newPassword: 'NewAuditPass456!' });
    return { pass: r.json && r.json.message, detail: r.json ? r.json.message : r.body.slice(0,100) };
  });

  // ── 5. GraphQL Integration ──
  await check('Marketplace items query returns data', 8, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { marketplaceItems { id name cost category } }' }, { Authorization: 'Bearer ' + TOKEN });
    return { pass: r.json && r.json.data && r.json.data.marketplaceItems && r.json.data.marketplaceItems.length > 0, detail: r.json ? (r.json.data ? r.json.data.marketplaceItems.length + ' items' : JSON.stringify(r.json.errors)) : r.body.slice(0,100) };
  });

  await check('FutureSelfNarrative query works', 5, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { futureSelfNarrative }' }, { Authorization: 'Bearer ' + TOKEN });
    return { pass: r.json && r.json.data && typeof r.json.data.futureSelfNarrative === 'string', detail: r.json ? (r.json.data ? 'narrative length=' + r.json.data.futureSelfNarrative.length : JSON.stringify(r.json.errors)) : r.body.slice(0,100) };
  });

  await check('Inbox query works', 5, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { inbox }' }, { Authorization: 'Bearer ' + TOKEN });
    return { pass: r.json && r.json.data && r.json.data.inbox !== undefined, detail: r.json ? JSON.stringify(r.json.data).slice(0,100) : r.body.slice(0,100) };
  });

  await check('Unread notifications query works', 5, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { unreadNotifications }' }, { Authorization: 'Bearer ' + TOKEN });
    return { pass: r.json && r.json.data && r.json.data.unreadNotifications !== undefined, detail: r.json ? ('notifications=' + r.json.data.unreadNotifications.length) : r.body.slice(0,100) };
  });

  await check('Safety score query works', 5, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var r = await fetch('POST', 'http://localhost:4000/graphql', { query: 'query { mySafetyScore }' }, { Authorization: 'Bearer ' + TOKEN });
    return { pass: r.json && r.json.data && r.json.data.mySafetyScore !== undefined, detail: r.json ? JSON.stringify(r.json.data).slice(0,100) : r.body.slice(0,100) };
  });

  // ── 6. Database Backup ──
  var backupDir = path.join(__dirname, '..', '..', 'backups', 'daily');

  await check('Backup files exist', 5, async function() {
    if (!fs.existsSync(backupDir)) return { pass: false, detail: 'Backup dir not found' };
    var files = fs.readdirSync(backupDir).filter(function(f) { return f.endsWith('.sql'); });
    return { pass: files.length > 0, detail: files.length + ' backup files in ' + backupDir };
  });

  await check('Backup data is valid SQL', 5, async function() {
    var files = fs.readdirSync(backupDir).filter(function(f) { return f.endsWith('.sql'); });
    if (files.length === 0) return { pass: false, detail: 'No backup files' };
    var content = fs.readFileSync(path.join(backupDir, files[0]), 'utf8');
    var isValid = content.includes('pg_dump') || content.includes('CREATE') || content.includes('COPY') || content.includes('SET');
    return { pass: isValid, detail: 'Backup content: ' + (content.length / 1024).toFixed(0) + ' KB, valid=' + isValid };
  });

  // ── 7. E2E Tests ──
  await check('E2E Playwright tests exist', 3, async function() {
    var e2eDir = path.join(__dirname, '..', '..', 'apps', 'web', 'e2e');
    var files = fs.readdirSync(e2eDir).filter(function(f) { return f.endsWith('.spec.ts'); });
    return { pass: files.length > 0, detail: files.length + ' test files: ' + files.join(', ') };
  });

  // ── 8. RBAC ──
  await check('Token contains role claim', 3, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var parts = TOKEN.split('.');
    var payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return { pass: payload.role === 'CHILD', detail: 'role=' + payload.role };
  });

  await check('Token contains sub claim', 3, async function() {
    if (!TOKEN) return { pass: false, detail: 'No token' };
    var parts = TOKEN.split('.');
    var payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return { pass: !!payload.sub, detail: 'sub=' + (payload.sub || 'missing') };
  });

  // ── 9. Observability ──
  await check('Prometheus metrics endpoint works', 3, async function() {
    var r = await fetch('GET', 'http://localhost:3000/metrics');
    return { pass: r.status === 200, detail: 'HTTP ' + r.status };
  });

  await check('x-correlation-id on responses', 3, async function() {
    var r = await fetch('GET', 'http://localhost:3000/gateway/health');
    return { pass: !!r.headers['x-correlation-id'], detail: r.headers['x-correlation-id'] || 'missing' };
  });

  // ── 10. Rate Limiting (LAST - blocks local IP) ──
  await check('Rate limit blocks brute force', 8, async function() {
    var results = [];
    for (var i = 0; i < 15; i++) {
      var r = await fetch('POST', 'http://localhost:3000/auth/login', { email: 'brute-' + i + '@test.com', password: 'wrong' });
      results.push(r.status);
    }
    var blocked = results.filter(function(s) { return s === 429; }).length;
    return { pass: blocked >= 1, detail: blocked + '/15 requests blocked (429)' };
  });

  // ── Compute Final Score ──
  var TOTAL_WEIGHT = EVIDENCE.reduce(function(s, e) { return s + e.weight; }, 0);
  var SCORE = EVIDENCE.reduce(function(s, e) { return s + (e.pass ? e.weight : 0); }, 0);
  var PASS_COUNT = EVIDENCE.filter(function(e) { return e.pass; }).length;
  var FAIL_COUNT = EVIDENCE.filter(function(e) { return !e.pass; }).length;
  var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  var weightedScore = TOTAL_WEIGHT > 0 ? ((SCORE / TOTAL_WEIGHT) * 10).toFixed(1) : '0.0';

  console.log('\n=== RESULTS ===');
  console.log('  Checks:', (PASS_COUNT + FAIL_COUNT), '| Passed:', PASS_COUNT, '| Failed:', FAIL_COUNT);
  console.log('  Weighted Score:', SCORE + '/' + TOTAL_WEIGHT, '=', weightedScore + '/10');
  console.log('  Elapsed:', elapsed + 's');

  var result = {
    timestamp: new Date().toISOString(),
    score: parseFloat(weightedScore),
    maxScore: 10,
    passed: PASS_COUNT,
    failed: FAIL_COUNT,
    weightedPoints: SCORE,
    maxWeightedPoints: TOTAL_WEIGHT,
    elapsed_seconds: parseFloat(elapsed),
    evidence: EVIDENCE,
    verdict: parseFloat(weightedScore) >= 9.8 ? 'BETA READY ✅' : 'NOT READY ❌',
  };

  var outputDir = path.join(__dirname, '..', 'outputs');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'FINAL_REAUDIT_EVIDENCE.json'), JSON.stringify(result, null, 2));
  console.log('\n📄 Report saved to pilot/outputs/FINAL_REAUDIT_EVIDENCE.json');
  console.log('  Verdict:', result.verdict);
  console.log('  Score:', weightedScore + '/10');
}

run().catch(function(err) { console.error('Fatal:', err); process.exit(1); });
