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
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
  ],
});
