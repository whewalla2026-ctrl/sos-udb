import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

const GATEWAY = 'http://gateway:3000';
const API = 'http://nestjs-graphql:4000';
const JWT_SECRET = __ENV.JWT_SECRET || 'change-me-to-a-strong-secret-at-least-256-bits-long!!';

function makeNestJWT(sub, email, role) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub,
    email,
    role,
    jti: `lt-${now}-${Math.random().toString(36).slice(2, 10)}`,
    iat: now,
    exp: now + 900,
  };
  const headerB64 = encoding.b64encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'url');
  const payloadB64 = encoding.b64encode(JSON.stringify(payload), 'url');
  const data = `${headerB64}.${payloadB64}`;
  const hmac = crypto.createHMAC('sha256', JWT_SECRET);
  hmac.update(data);
  const sig = hmac.digest('base64url');
  return `${data}.${sig}`;
}

const gqlTrend = new Trend('gql_ms');
const gqlWriteTrend = new Trend('gql_write_ms');
const metTrend = new Trend('metrics_ms');
const errRate = new Rate('errors');
const okCount = new Counter('ok');

const meBody = JSON.stringify({
  query: `query Me { me { id email role displayName } }`,
});

const trackUsageBody = JSON.stringify({
  query: `mutation TU($metric: String!, $value: Int!) { trackUsage(metric: $metric, value: $value) }`,
  variables: { metric: 'loadtest', value: 1 },
});

export function setup() {
  const tokens = [];
  for (let i = 0; i < 5; i++) {
    const email = `lt_setup_${i}@loadtest.udb`;
    const pw = 'LoadTest123!';
    const headers = { 'Content-Type': 'application/json' };

    const reg = http.post(`${GATEWAY}/auth/register`, JSON.stringify({
      email, password: pw, displayName: `LoadTester_${i}`, role: 'CHILD',
    }), { headers });

    let userId, userEmail, userRole;
    if (reg.status === 201) {
      const body = reg.json();
      userId = body.userId;
      userEmail = body.email;
      userRole = body.role;
    } else if (reg.status === 409) {
      const login = http.post(`${GATEWAY}/auth/login`, JSON.stringify({ email, password: pw }), { headers });
      if (login.status === 200) {
        const body = login.json();
        userId = body.userId;
        userEmail = body.email;
        userRole = body.role;
      }
    }

    if (userId) {
      tokens.push(makeNestJWT(userId, userEmail, userRole));
    }

    sleep(12);
  }
  return tokens;
}

export const options = {
  setupTimeout: '120s',
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    gql_ms: ['p(95)<500'],
    errors: ['rate<0.10'],
  },
};

export default function (tokens) {
  if (!tokens || tokens.length === 0) return;
  const idx = (__VU - 1) % tokens.length;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens[idx]}`,
  };

  const n = __VU % 10;

  if (n < 5) {
    const r = http.post(`${API}/graphql`, meBody, { headers });
    gqlTrend.add(r.timings.duration);
    const pass = check(r, { 'me OK': (x) => x.status === 200 && x.json('data.me') !== null });
    pass ? okCount.add(1) : errRate.add(1);
  } else if (n < 8) {
    const r = http.post(`${API}/graphql`, trackUsageBody, { headers });
    gqlWriteTrend.add(r.timings.duration);
    const pass = check(r, { 'trackUsage OK': (x) => x.status === 200 && x.json('data.trackUsage') !== null });
    pass ? okCount.add(1) : errRate.add(1);
  } else {
    const r = http.get(`${API}/metrics`);
    metTrend.add(r.timings.duration);
    const pass = check(r, { 'metrics OK': (x) => x.status === 200 });
    pass ? okCount.add(1) : errRate.add(1);
  }

  sleep(Math.random() * 1 + 0.2);
}
