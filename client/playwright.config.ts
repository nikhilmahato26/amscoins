import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright e2e configuration.
 *
 * Two webServers start automatically:
 *  1. The hermetic Express backend (in-memory MongoDB, NEVER Atlas) on :4000
 *  2. Vite dev server on :5173
 *
 * Run from client/:  npm run e2e
 * UI mode:           npm run e2e:ui
 */
export default defineConfig({
  testDir: 'tests-e2e',
  /* Fail fast on flake — raise timeout generously for CI */
  timeout: 30_000,
  expect: { timeout: 10_000 },
  /* Reporter */
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    viewport: { width: 375, height: 812 },
    /* Keep traces on first retry to help debug */
    trace: 'on-first-retry',
    /* Screenshots on failure */
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      /* 1. Hermetic backend — in-memory Mongo, not Atlas */
      command: 'cd ../server && npm run e2e:server',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      /* 2. Vite dev server — VITE_API_URL injected via env so no .env file needed */
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_URL: 'http://localhost:4000/api',
        /*
         * Payment handles are fixtures here, not the real ones — the deposit
         * screen hides any method whose destination is unset, so the e2e needs
         * these to have something to click.
         */
        VITE_USDT_TRC20_ADDRESS: 'TTestTrc20AddressForE2eOnly000000000',
        VITE_USDT_BEP20_ADDRESS: '0xTestBep20AddressForE2eOnly00000000000000',
        VITE_BINANCE_PAY_ID: '123456789',
        VITE_WHATSAPP_NUMBER: '919999999999',
        VITE_TELEGRAM_USERNAME: 'asmcoins_e2e',
      },
    },
  ],
})
