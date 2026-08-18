/**
 * payment-settings.spec.ts — amount-gated deposit flow + admin Settings page.
 *
 * Threshold logic (default 200,000 paise = ₹2,000 via getSingleton):
 *  - amount ≤ threshold → shows INR/USDT segmented toggle (role="tablist")
 *  - amount > threshold → shows four-option chooser with h3 "USDT (Crypto)" and "INR Payment"
 *
 * PaymentMethodPage reads plan + amount from URL query params (?plan=&amt=) so
 * we can deep-link directly to the payment chooser without driving the full
 * plan-selection → summary flow.
 *
 * Silver plan: min ₹1,000 (100,000 paise), max ₹10,000 (1,000,000 paise).
 *   - Small deposit: ₹1,500 (150,000 paise) — exercises INR/USDT toggle branch
 *   - Large deposit: ₹5,000 (500,000 paise) — exercises four-option chooser branch
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail } from './helpers'

test.describe('deposit payment threshold', () => {
  /** Register a fresh user and log them in via the UI, returning the page at /app */
  async function loginAsNewUser(page: import('@playwright/test').Page): Promise<void> {
    const email = uniqueEmail('paysettings')
    const password = 'paysettings1'
    await page.goto('/register')
    await page.getByPlaceholder('Your full name').fill('Pay Settings Tester')
    await page.getByPlaceholder('Enter your email').fill(email)
    await page.getByPlaceholder('Create a strong password').fill(password)
    await page.getByPlaceholder('Confirm your password').fill(password)
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
  }

  test('small deposit (≤ threshold) shows INR/USDT toggle, not the four-option grid', async ({ page }) => {
    // ── 1. Seed user and log in ──
    await loginAsNewUser(page)

    // ── 2. Navigate directly to the payment chooser with a small amount ──
    // 150,000 paise = ₹1,500 — well within the default 200,000 paise threshold
    await page.goto('/app/payment?plan=silver&amt=150000')

    // Wait for the chooser to load (settings must resolve before the UI renders)
    await expect(page.getByRole('tablist', { name: /deposit currency/i })).toBeVisible({ timeout: 15_000 })

    // ── 3. The INR/USDT segmented toggle MUST be present ──
    await expect(page.getByRole('tab', { name: /pay in inr/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /pay in usdt/i })).toBeVisible()

    // ── 4. The four-option "USDT (Crypto)" and large-deposit "INR Payment" headings
    //       must NOT be visible (they are only rendered when !isSmall) ──
    // The large-deposit USDT heading is an h3 inside a section with aria-labelledby="pay-usdt-heading"
    // In small mode, that section is hidden (only shown when !isSmall || mode === 'USDT').
    // Switch to INR mode (default) so neither big-deposit section shows.
    await page.getByRole('tab', { name: /pay in inr/i }).click()
    // The full-chooser INR Payment h3 (aria-labelledby="pay-inr-heading") is only rendered when !isSmall
    await expect(page.locator('#pay-inr-heading')).not.toBeVisible()
  })

  test('large deposit (> threshold) shows four-option chooser with USDT and INR headings', async ({ page }) => {
    // ── 1. Seed user and log in ──
    await loginAsNewUser(page)

    // ── 2. Navigate directly to the payment chooser with a large amount ──
    // 500,000 paise = ₹5,000 — above the default 200,000 paise threshold
    await page.goto('/app/payment?plan=silver&amt=500000')

    // Wait for settings to load and the chooser to render
    await expect(page.getByRole('heading', { name: 'USDT (Crypto)' })).toBeVisible({ timeout: 15_000 })

    // ── 3. Both section headings must be present ──
    await expect(page.getByRole('heading', { name: 'USDT (Crypto)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'INR Payment' })).toBeVisible()

    // ── 4. The INR/USDT toggle must NOT appear (only for small deposits) ──
    await expect(page.getByRole('tablist', { name: /deposit currency/i })).not.toBeVisible()
  })
})

test('admin can open settings page and see Payment Settings heading', async ({ page }) => {
  // ── 1. Admin logs in via UI (mirrors admin.spec.ts pattern) ──
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()

  // Admin should redirect to /admin
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  // ── 2. Navigate to the Settings page ──
  await page.goto('/admin/settings')

  // ── 3. The "Payment Settings" h1 must be visible ──
  await expect(page.getByRole('heading', { name: 'Payment Settings' })).toBeVisible({ timeout: 10_000 })
})

test('admin can set cycle duration and auto-reject window', async ({ page }) => {
  // ── 1. Admin logs in ──
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  // ── 2. Open settings ──
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: 'Payment Settings' })).toBeVisible({ timeout: 10_000 })

  // ── 3. Set cycle duration to 36 and auto-reject to 12 ──
  const cycleDurationInput = page.getByLabel(/cycle duration \(hours\)/i)
  await cycleDurationInput.fill('36')
  const autoRejectInput = page.getByLabel(/auto-reject window \(hours\)/i)
  await autoRejectInput.fill('12')

  // ── 4. Save and confirm success ──
  await page.getByRole('button', { name: /save settings/i }).click()
  await expect(page.getByRole('button', { name: /saved/i })).toBeVisible({ timeout: 8_000 })

  // ── 5. Reload and confirm values persist ──
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Payment Settings' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel(/cycle duration \(hours\)/i)).toHaveValue('36')
  await expect(page.getByLabel(/auto-reject window \(hours\)/i)).toHaveValue('12')
})
