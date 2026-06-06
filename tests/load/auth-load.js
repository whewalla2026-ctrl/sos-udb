import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://udb-api:4000';
const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://udb-gateway:3000';

export default function () {
  const health = http.get(`${API_URL}/health`);
  check(health, { 'api health 200': (r) => r.status === 200 });

  const gwHealth = http.get(`${GATEWAY_URL}/gateway/health`);
  check(gwHealth, { 'gateway health 200': (r) => r.status === 200 });

  sleep(1);
}
