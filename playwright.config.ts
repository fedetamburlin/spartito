import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests only: no screenshots, no visual baselines.
 * The app is built before the run, then served by `vite preview`.
 *
 * CROSS_BROWSER=1 adds the Firefox/WebKit projects used by CI; they only
 * run the cross-browser smoke file, not the whole Chromium suite.
 */
const crossBrowser = process.env.CROSS_BROWSER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(crossBrowser
      ? [
          {
            name: 'firefox',
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['Desktop Firefox'] }
          },
          {
            name: 'webkit',
            testMatch: /cross-browser\.spec\.ts/,
            use: { ...devices['Desktop Safari'] }
          }
        ]
      : [])
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
