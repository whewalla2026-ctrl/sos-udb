const http = require('http');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const GATEWAY_GRAPHQL_URL = process.env.GATEWAY_GRAPHQL_URL || `${GATEWAY_URL}/graphql`;
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, label) {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`); }
}

function request(method, url, body, headers = {}) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname,
      method, headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 5000,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function healthCheck(url, label) {
  try {
    const res = await request('GET', url);
    if (res.status === 200) { console.log(`  ✓ ${label} is healthy`); return true; }
    console.log(`  ⚠ ${label} returned ${res.status}`);
    return false;
  } catch (e) {
    console.log(`  ⚠ ${label} not reachable: ${e.message}`);
    return false;
  }
}

(async () => {
  console.log('\n=== Auth Pipeline Integration Tests ===\n');

  // Check available services
  const gatewayOk = await healthCheck(`${GATEWAY_URL}/gateway/health`, 'Gateway');
  const authOk = await healthCheck(`${GATEWAY_URL}/auth/health`, 'Auth service');

  if (!gatewayOk || !authOk) {
    console.log('\n  ❌ Essential services not running. Skipping auth pipeline tests.');
    console.log('  Start the stack with: docker compose -f docker-compose.prod.yml up -d');
    skipped = 8;
    printSummary();
    process.exit(0);
  }

  let tokens = {};

  // 1. Register
  console.log('\n[Register]');
  try {
    const reg = await request('POST', `${GATEWAY_URL}/auth/register`, { email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(reg.status === 201, 'POST /auth/register returns 201');
    assert(reg.body && reg.body.token, 'Response contains token');
    assert(reg.body && reg.body.refreshToken, 'Response contains refreshToken');
    assert(reg.body && reg.body.userId, 'Response contains userId');
    if (reg.body.token) tokens = reg.body;
  } catch (e) {
    assert(false, `Register request failed: ${e.message}`);
  }

  // 2. Login
  console.log('\n[Login]');
  try {
    const login = await request('POST', `${GATEWAY_URL}/auth/login`, { email: TEST_EMAIL, password: TEST_PASSWORD });
    assert(login.status === 200, 'POST /auth/login returns 200');
    assert(login.body && login.body.token, 'Response contains token');
    assert(login.body && login.body.refreshToken, 'Response contains refreshToken');
    if (login.body.token) tokens = login.body;
  } catch (e) {
    assert(false, `Login request failed: ${e.message}`);
  }

  // 3. GraphQL query with valid token
  console.log('\n[GraphQL with valid token]');
  try {
    const gql = await request('POST', GATEWAY_GRAPHQL_URL,
      { query: '{ __typename }' },
      { Authorization: `Bearer ${tokens.token}` }
    );
    if (gql.status === 200) {
      assert(true, 'GraphQL returns 200 with valid token');
      assert(gql.body && gql.body.data && gql.body.data.__typename === 'Query',
        'GraphQL response contains valid data');
    } else {
      assert(false, `GraphQL returned ${gql.status}: ${JSON.stringify(gql.body).slice(0, 100)}`);
    }
  } catch (e) {
    assert(false, `GraphQL request failed: ${e.message}`);
  }

  // 4. GraphQL query with bad token
  console.log('\n[GraphQL with invalid token]');
  try {
    const bad = await request('POST', GATEWAY_GRAPHQL_URL,
      { query: '{ __typename }' },
      { Authorization: 'Bearer bad-token' }
    );
    assert(bad.status === 401 || (bad.body && bad.body.errors),
      `GraphQL rejects bad token (status: ${bad.status})`);
  } catch (e) {
    assert(false, `Bad token request failed: ${e.message}`);
  }

  // 5. Token refresh
  console.log('\n[Token refresh]');
  try {
    const refresh = await request('POST', `${GATEWAY_URL}/auth/refresh`, { refreshToken: tokens.refreshToken });
    assert(refresh.status === 200, 'POST /auth/refresh returns 200');
    assert(refresh.body && refresh.body.token, 'Response contains new token');
    assert(refresh.body && refresh.body.refreshToken, 'Response contains new refreshToken');
    if (refresh.body.token) {
      tokens.token = refresh.body.token;
      tokens.refreshToken = refresh.body.refreshToken;
    }
  } catch (e) {
    assert(false, `Refresh request failed: ${e.message}`);
  }

  // 6. Logout
  console.log('\n[Logout]');
  try {
    const logout = await request('POST', `${GATEWAY_URL}/auth/logout`,
      { refreshToken: tokens.refreshToken },
      { Authorization: `Bearer ${tokens.token}` }
    );
    assert(logout.status === 200, 'POST /auth/logout returns 200');
    assert(logout.body && logout.body.success === true, 'Response contains success: true');
  } catch (e) {
    assert(false, `Logout request failed: ${e.message}`);
  }

  // 7. GraphQL with logged-out token
  console.log('\n[GraphQL with logged-out token]');
  try {
    const after = await request('POST', GATEWAY_GRAPHQL_URL,
      { query: '{ __typename }' },
      { Authorization: `Bearer ${tokens.token}` }
    );
    assert(after.status === 401 || (after.body && after.body.errors),
      `GraphQL rejects logged-out token (status: ${after.status})`);
  } catch (e) {
    assert(false, `Logged-out request failed: ${e.message}`);
  }

  // 8. Rate limiting on auth endpoints
  console.log('\n[Rate limiting]');
  try {
    let rateLimited = false;
    for (let i = 0; i < 15; i++) {
      const r = await request('POST', `${GATEWAY_URL}/auth/login`,
        { email: `rate-${i}@test.com`, password: 'testpass123' });
      if (r.status === 429) { rateLimited = true; break; }
    }
    assert(rateLimited, 'Rate limiter triggered after multiple requests');
  } catch (e) {
    assert(false, `Rate limit test failed: ${e.message}`);
  }

  printSummary();
})();

function printSummary() {
  const total = passed + failed + skipped;
  console.log(`\n─── Results ───`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${total}`);
  process.exit(failed > 0 ? 1 : 0);
}
