import { test, expect } from '@playwright/test';

var BASE = 'http://localhost:3030';

test.describe('Public Pages', function() {
  test('Landing page loads', async function({ page }) {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 15000 });
    var title = await page.title();
    expect(title).toContain('UDB');
    var html = await page.locator('html').textContent();
    expect(html.length).toBeGreaterThan(100);
  });

  test('Login page loads', async function({ page }) {
    await page.goto(BASE + '/auth/login', { waitUntil: 'load', timeout: 15000 });
    var html = await page.locator('html').textContent();
    expect(html.length).toBeGreaterThan(100);
  });

  test('Register page loads', async function({ page }) {
    await page.goto(BASE + '/auth/register', { waitUntil: 'load', timeout: 15000 });
    var html = await page.locator('html').textContent();
    expect(html.length).toBeGreaterThan(100);
  });

  test('Forgot password page loads', async function({ page }) {
    await page.goto(BASE + '/auth/forgot-password', { waitUntil: 'load', timeout: 15000 });
    var html = await page.locator('html').textContent();
    expect(html.length).toBeGreaterThan(100);
  });

  test('Reset password page loads', async function({ page }) {
    await page.goto(BASE + '/auth/reset-password', { waitUntil: 'load', timeout: 15000 });
    var html = await page.locator('html').textContent();
    expect(html.length).toBeGreaterThan(100);
  });
});

var dashboardPages = [
  '/dashboard', '/dashboard/doter', '/dashboard/notifications',
  '/dashboard/quests', '/dashboard/goals', '/dashboard/calendar',
  '/dashboard/weekly-plan', '/dashboard/academic', '/dashboard/tutor',
  '/dashboard/evidence', '/dashboard/biometric', '/dashboard/bank',
  '/dashboard/ventures', '/dashboard/family', '/dashboard/messages',
  '/dashboard/safety', '/dashboard/future-self', '/dashboard/achievements',
  '/dashboard/joon-world', '/dashboard/marketplace', '/dashboard/settings',
];

test.describe('Dashboard Pages', function() {
  dashboardPages.forEach(function(path) {
    var name = path.replace('/dashboard/', '') || 'home';
    test(name + ' renders content', async function({ page }) {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 15000 });
      var html = await page.locator('html').textContent();
      expect(html.length).toBeGreaterThan(100);
    });
  });
});

test.describe('API Health', function() {
  test('Gateway is healthy', async function({ request }) {
    var res = await request.get('http://localhost:3000/gateway/health');
    expect(res.ok()).toBeTruthy();
    var data = await res.json();
    expect(data.status).toBe('healthy');
  });

  test('Auth service is healthy', async function({ request }) {
    var res = await request.get('http://localhost:3000/auth/health');
    expect(res.ok()).toBeTruthy();
  });

  test('NestJS GraphQL is responding', async function({ request }) {
    var res = await request.post('http://localhost:4000/graphql', {
      data: { query: 'query { __typename }' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('GraphQL Gateway Integration', function() {
  test('Auth register via gateway works', async function({ request }) {
    var email = 'e2e-test-' + Date.now() + '@test.com';
    var res = await request.post('http://localhost:3000/auth/register', {
      data: { email: email, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok()).toBeTruthy();
    var data = await res.json();
    expect(data.email).toBe(email);
    expect(data.role).toBe('CHILD');
    expect(data.token).toBeTruthy();
  });

  test('Login with valid credentials works', async function({ request }) {
    var email = 'e2e-test-login-' + Date.now() + '@test.com';
    var registerRes = await request.post('http://localhost:3000/auth/register', {
      data: { email: email, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(registerRes.ok()).toBeTruthy();

    var loginRes = await request.post('http://localhost:3000/auth/login', {
      data: { email: email, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(loginRes.ok()).toBeTruthy();
    var loginData = await loginRes.json();
    expect(loginData.email).toBe(email);
    expect(loginData.token).toBeTruthy();
  });
});
