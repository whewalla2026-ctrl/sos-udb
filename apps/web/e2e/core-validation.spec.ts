import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3030';
const API = 'http://localhost:4000';

test.describe('Public Pages', () => {
  test('Landing page loads', async ({ page }) => {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 15000 });
    const title = await page.title();
    expect(title).toContain('UDB');
    const html = await page.locator('html').textContent();
    expect(html!.length).toBeGreaterThan(100);
  });

  test('Login page loads', async ({ page }) => {
    await page.goto(BASE + '/auth/login', { waitUntil: 'load', timeout: 15000 });
    const html = await page.locator('html').textContent();
    expect(html!.length).toBeGreaterThan(100);
  });

  test('Register page loads', async ({ page }) => {
    await page.goto(BASE + '/auth/register', { waitUntil: 'load', timeout: 15000 });
    const html = await page.locator('html').textContent();
    expect(html!.length).toBeGreaterThan(100);
  });

  test('Forgot password page loads', async ({ page }) => {
    await page.goto(BASE + '/auth/forgot-password', { waitUntil: 'load', timeout: 15000 });
    const html = await page.locator('html').textContent();
    expect(html!.length).toBeGreaterThan(100);
  });

  test('Reset password page loads', async ({ page }) => {
    await page.goto(BASE + '/auth/reset-password', { waitUntil: 'load', timeout: 15000 });
    const html = await page.locator('html').textContent();
    expect(html!.length).toBeGreaterThan(100);
  });
});

const dashboardPages = [
  '/dashboard', '/dashboard/doter', '/dashboard/notifications',
  '/dashboard/quests', '/dashboard/goals', '/dashboard/calendar',
  '/dashboard/weekly-plan', '/dashboard/academic', '/dashboard/tutor',
  '/dashboard/evidence', '/dashboard/biometric', '/dashboard/bank',
  '/dashboard/ventures', '/dashboard/family', '/dashboard/messages',
  '/dashboard/safety', '/dashboard/future-self', '/dashboard/achievements',
  '/dashboard/joon-world', '/dashboard/marketplace', '/dashboard/settings',
];

test.describe('Dashboard Pages', () => {
  dashboardPages.forEach((path) => {
    const name = path.replace('/dashboard/', '') || 'home';
    test(name + ' renders content', async ({ page }) => {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 15000 });
      const html = await page.locator('html').textContent();
      expect(html!.length).toBeGreaterThan(100);
    });
  });
});

test.describe('API Health', () => {
  test('NestJS API is healthy', async ({ request }) => {
    const res = await request.get(API + '/health');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('status');
  });

  test('GraphQL endpoint responds', async ({ request }) => {
    const res = await request.post(API + '/graphql', {
      data: { query: '{ __typename }' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Auth Endpoints', () => {
  test('Register endpoint exists', async ({ request }) => {
    const res = await request.post(API + '/auth/register', {
      data: { email: 'e2e-test-' + Date.now() + '@test.com', password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(500);
  });
});
