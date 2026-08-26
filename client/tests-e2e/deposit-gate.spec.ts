/**
 * deposit-gate.spec.ts
 *
 * Browser coverage for the deposit gate (single in-flight deposit + a
 * post-approval cooldown). The payment page (/app/payment) must:
 *   - show the payment chooser when the user is free to deposit (gate "open")
 *   - replace it with a "pending approval" notice while a deposit is awaiting
 *     the admin (gate "pending") — the user cannot start another
 *   - replace it with a cooldown notice + live countdown after approval, until
 *     `depositCooldownHours` elapses (gate "cooldown")
 *
 * The server is the source of truth: getDepositGate + createInvestment's
 * 409/pending and 429/cooldown enforcement are proven deterministically in
 * server/tests/unit/deposit.gate.test.js and the routes integration test. These
 * specs prove the UI reads the gate and blocks the deposit action accordingly.
 *
 * NOTE: `depositCooldownHours` is a shared singleton (default 6h). These run
 * serially and afterEach resets it to the default so no state leaks.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { uniqueEmail, register, adminLogin, createInvestment, approveDeposit, updateSettings } from './helpers'

const PAY_URL = '/app/payment?plan=silver&amt=200000'

async function userUILogin(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
}

test.describe.configure({ mode: 'serial' })

// Cooldown hours is a shared singleton — put it back to its 6h default so a
// spec that leans on it can't leak an altered value into other specs.
test.afterEach(async () => {
  const adminToken = await adminLogin()
  await updateSettings(adminToken, { depositCooldownHours: 6 })
})

test('a user with no deposit sees the payment chooser (gate open)', async ({ page }) => {
  const password = 'userpass1'
  const email = uniqueEmail('gate-open')
  await register({ name: 'Gate Open', email, password })

  await userUILogin(page, email, password)
  await page.goto(PAY_URL)

  await expect(page.getByRole('heading', { name: /Invest & Pay/i })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Choose payment method')).toBeVisible()
  await expect(page.getByTestId('deposit-gate-pending')).toHaveCount(0)
  await expect(page.getByTestId('deposit-gate-cooldown')).toHaveCount(0)
})

test('a pending deposit blocks a new one and shows the pending notice', async ({ page }) => {
  const password = 'userpass1'
  const email = uniqueEmail('gate-pending')
  const user = await register({ name: 'Gate Pending', email, password })
  await createInvestment(user.token, 'silver', 200000) // stays pending — awaiting admin

  await userUILogin(page, email, password)
  await page.goto(PAY_URL)

  await expect(page.getByTestId('deposit-gate-pending')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/pending approval/i)).toBeVisible()
  // The chooser is gone — no way to start a second deposit from the UI.
  await expect(page.getByText('Choose payment method')).toHaveCount(0)
})

test('an approved deposit starts a cooldown with a live countdown', async ({ page }) => {
  const adminToken = await adminLogin()
  await updateSettings(adminToken, { depositCooldownHours: 6 })

  const password = 'userpass1'
  const email = uniqueEmail('gate-cooldown')
  const user = await register({ name: 'Gate Cooldown', email, password })
  const { id } = await createInvestment(user.token, 'silver', 200000)
  await approveDeposit(adminToken, id) // approval anchors the cooldown

  await userUILogin(page, email, password)
  await page.goto(PAY_URL)

  await expect(page.getByTestId('deposit-gate-cooldown')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('deposit-cooldown-countdown')).toBeVisible()
  await expect(page.getByText('Choose payment method')).toHaveCount(0)
})
