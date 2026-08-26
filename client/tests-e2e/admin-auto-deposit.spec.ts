/**
 * admin-auto-deposit.spec.ts
 *
 * Browser coverage for the auto-deposit automation (the mirror of auto-reject):
 *   - /admin/settings exposes the "auto-deposit window" field + on/off toggle
 *   - /admin/investments shows a live auto-deposit countdown on pending rows
 *     ONLY while auto-deposit is enabled (it defaults OFF — money-sensitive).
 *
 * The timeout firing itself (pending -> auto-approved/active after the window)
 * is proven deterministically by the server unit tests
 * (server/tests/unit/automation.timing.test.js + settings.toggles.test.js),
 * since the BullMQ worker/sweep is Redis-disabled on the hermetic e2e server.
 *
 * NOTE: Settings are a shared singleton on the hermetic server. These tests run
 * serially and the afterEach resets auto-deposit OFF so other specs are
 * unaffected.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, adminLogin, createInvestment, updateSettings } from './helpers'

async function adminUILogin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
}

test.describe.configure({ mode: 'serial' })

// Auto-deposit is a shared singleton flag — always put it back OFF (its default)
// so it can't leak the extra column into other specs.
test.afterEach(async () => {
  const adminToken = await adminLogin()
  await updateSettings(adminToken, { autoDepositEnabled: false })
})

test('settings: the auto-deposit window field and toggle are shown', async ({ page }) => {
  await adminUILogin(page)
  await page.goto('/admin/settings')

  await expect(
    page.getByText('Automatically approve deposits still pending after the auto-deposit window'),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Auto-deposit window \(hours\)/)).toBeVisible()
})

test('investments tab: pending rows show an auto-deposit countdown when auto-deposit is on', async ({ page }) => {
  const adminToken = await adminLogin()
  await updateSettings(adminToken, { autoDepositEnabled: true, autoDepositHours: 24 })

  const user = await register({ name: 'AutoDep User', email: uniqueEmail('autodep'), password: 'userpass1' })
  await createInvestment(user.token, 'silver', 200000) // stays pending

  await adminUILogin(page)
  await page.goto('/admin/investments')
  await expect(page.getByRole('heading', { name: 'Investments' })).toBeVisible({ timeout: 10_000 })

  // Auto-deposit is ON → the column header and a live countdown cell show.
  await expect(page.getByRole('columnheader', { name: 'Auto deposit' })).toBeVisible()
  await expect(page.getByTestId('auto-deposit-countdown').first()).toBeVisible()
})

test('investments tab: no auto-deposit column when auto-deposit is off (default)', async ({ page }) => {
  const adminToken = await adminLogin()
  await updateSettings(adminToken, { autoDepositEnabled: false })

  const user = await register({ name: 'NoAutoDep User', email: uniqueEmail('noautodep'), password: 'userpass1' })
  await createInvestment(user.token, 'silver', 200000) // stays pending

  await adminUILogin(page)
  await page.goto('/admin/investments')
  await expect(page.getByRole('heading', { name: 'Investments' })).toBeVisible({ timeout: 10_000 })

  // Off → the column is hidden entirely (mirror of how auto-reject hides).
  await expect(page.getByRole('columnheader', { name: 'Auto deposit' })).toHaveCount(0)
  await expect(page.getByTestId('auto-deposit-countdown')).toHaveCount(0)
})
