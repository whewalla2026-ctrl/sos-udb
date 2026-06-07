import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.05'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Health check
  const health = http.get(`${BASE}/gateway/health`);
  check(health, { 'health 200': (r) => r.status === 200 }) || errorRate.add(1);

  // Login attempt
  const loginStart = Date.now();
  const login = http.post(`${BASE}/auth/login`,
    JSON.stringify({ email: 'sarah.demo@udb.app', password: 'DemoParent123!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(Date.now() - loginStart);
  check(login, { 'login success': (r) => r.status === 200 }) || errorRate.add(1);

  sleep(0.5);
}
