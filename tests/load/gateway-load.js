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

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://udb-gateway:3000';

export default function () {
  const res = http.get(`${GATEWAY_URL}/gateway/health`);
  check(res, { 'gateway 200': (r) => r.status === 200 });
  sleep(1);
}
