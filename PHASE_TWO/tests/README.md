# Phase Two QA & Testing Suite

## Load Testing (k6)

```javascript
// tests/load/baseline.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function() {
  const res = http.get('http://localhost:4000/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

## E2E Test Suite

```typescript
// e2e/phase2/quest-completion.spec.ts
import { test, expect } from '@playwright/test';

test('child completes quest with vision proof', async ({ page }) => {
  await page.goto('/dashboard/quests');
  await page.click('[data-testid="quest-1"]');
  await page.setInputFiles('input[type="file"]', ['test-evidence.jpg']);
  await expect(page.locator('[data-testid="approval-status"]')).toContainText('Approved');
});
```

## Compliance Tests

```typescript
// tests/compliance/coppa.spec.ts
describe('COPPA VPC Flow', () => {
  test('child under 13 cannot register without parent', async () => {
    const response = await api.register({ age: 10, email: 'test@child.com' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('VPC_REQUIRED');
  });
});
```

## Chaos Engineering

```yaml
# .github/workflows/chaos.yml
name: Chaos Engineering
on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - name: Simulate Redis failure
        run: kubectl scale deployment redis --replicas=0
      - name: Verify graceful degradation
        run: curl http://localhost:4000/health
      - name: Restore
        run: kubectl scale deployment redis --replicas=1
```