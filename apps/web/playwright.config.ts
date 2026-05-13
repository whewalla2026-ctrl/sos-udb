import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 20000,
  expect: { timeout: 5000 },
  workers: 4,
  use: {
    baseURL: 'http://localhost:3030',
    headless: true,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  webServer: {
    command: 'pnpm --filter @udb/web dev',
    url: 'http://localhost:3030',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
  ],
});
