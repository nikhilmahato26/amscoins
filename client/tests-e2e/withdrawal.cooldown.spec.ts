/**
 * withdrawal.cooldown.spec.ts — verifies the admin-configurable withdrawal
 * rate-limit end to end.
 *
 * Server is the source of truth: a 2nd withdrawal inside the window → HTTP 429.
 * Client mirrors it: the withdraw page shows a live "You can withdraw again in
 * Xh Ym Zs" notice and disables the submit button.
 *
 * The cooldown is a shared Settings singleton on the hermetic e2e server; we set
 * it to 12h up front (its default) so this test is self-contained.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, adminLogin, adminAdjustWallet, updateSettings, createWithdrawal } from './helpers'

const API = 'http://localhost:4000/api'

test('withdrawal cooldown: 2nd request blocked by server (429) and UI countdown', async ({ page }) => {
  const adminToken = await adminLogin()
  // Ensure the cooldown is on (12h is also the default).
  await updateSettings(adminToken, { withdrawalCooldownHours: 12 })

  const email = uniqueEmail('cooldown')
  const password = 'cooldownpass1'
  const { user, token } = await register({ name: 'Cooldown User', email, password })

  // Seed ₹10,000 so two ₹1,000 withdrawals are affordable (if allowed).
  await adminAdjustWallet(adminToken, user.id, 1_000_000, 'credit', 'e2e cooldown seed')

  /* ── 1. First withdrawal via API succeeds ── */
  const first = await createWithdrawal(token, { amount: 100_000, upiId: 'cooldown@okaxis' })
  expect(first._id).toBeTruthy()

  /* ── 2. Immediate 2nd withdrawal via API is rejected with 429 ── */
  const res = await fetch(`${API}/withdrawals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: 100_000, upiId: 'cooldown@okaxis' }),
  })
  expect(res.status).toBe(429)
  const bodyText = await res.text()
  expect(bodyText.toLowerCase()).toContain('withdraw again in')

  /* ── 3. UI mirrors it: countdown notice + disabled submit ── */
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

  await page.goto('/app/withdraw')
  await expect(page.getByText(/withdrawable balance/i)).toBeVisible({ timeout: 10_000 })

  // Live cooldown notice is shown.
  await expect(page.getByText(/you can withdraw again in/i)).toBeVisible({ timeout: 10_000 })

  // Submit button is disabled and shows the countdown label.
  const submitBtn = page.getByRole('button', { name: /available in/i })
  await expect(submitBtn).toBeVisible()
  await expect(submitBtn).toBeDisabled()
})

test('withdrawal cooldown: disabled (0h) allows back-to-back withdrawals', async ({ page }) => {
  const adminToken = await adminLogin()
  await updateSettings(adminToken, { withdrawalCooldownHours: 0 })

  try {
    const email = uniqueEmail('nocooldown')
    const password = 'nocooldownpass1'
    const { user, token } = await register({ name: 'No Cooldown User', email, password })
    await adminAdjustWallet(adminToken, user.id, 1_000_000, 'credit', 'e2e nocooldown seed')

    const first = await createWithdrawal(token, { amount: 100_000, upiId: 'nc1@okaxis' })
    expect(first._id).toBeTruthy()
    // With cooldown off, an immediate second withdrawal is allowed.
    const second = await createWithdrawal(token, { amount: 100_000, upiId: 'nc2@okaxis' })
    expect(second._id).toBeTruthy()

    // UI shows no cooldown notice; submit is enabled.
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    await page.goto('/app/withdraw')
    await expect(page.getByText(/withdrawable balance/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/you can withdraw again in/i)).toHaveCount(0)
  } finally {
    // Restore the default so other specs see the usual cooldown.
    await updateSettings(adminToken, { withdrawalCooldownHours: 12 })
  }
})
