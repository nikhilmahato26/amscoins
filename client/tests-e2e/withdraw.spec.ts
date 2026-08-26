/**
 * withdraw.spec.ts — seed balance via helper, submit withdrawal via UI,
 * assert TDS breakdown and pending status in history list.
 *
 * Amount input: aria-label="Amount to withdraw in rupees" (inputMode="decimal")
 * Min withdrawal: ₹500. TDS: 5% → ₹1,000 withdrawal nets ₹950.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, adminLogin, adminAdjustWallet } from './helpers'

test('withdraw: seed balance, submit UI form, see breakdown + pending in list', async ({ page }) => {
  const email = uniqueEmail('withdraw')
  const password = 'withdrawpass1'

  /* ── 1. Register via API ── */
  const { user } = await register({ name: 'Withdraw User', email, password })
  const userId = user.id

  /* ── 2. Credit wallet with ₹10,000 (1,000,000 paise) via admin helper ── */
  const adminToken = await adminLogin()
  await adminAdjustWallet(adminToken, userId, 1_000_000, 'credit', 'e2e seed balance')

  /* ── 3. Log in via UI ── */
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

  /* ── 4. Navigate to /app/withdraw ── */
  await page.goto('/app/withdraw')
  await expect(page.getByText(/withdrawable balance/i)).toBeVisible({ timeout: 10_000 })

  /* ── 5. Fill withdrawal amount: ₹1,000 ── */
  // Input has aria-label="Amount to withdraw in rupees" (inputMode="decimal", NOT type=number)
  const amountInput = page.getByLabel(/amount to withdraw in rupees/i)
  await amountInput.fill('1000')

  /* ── 6. Fill UPI ID ──
     A freshly-registered user has no saved payout methods, so the withdraw
     page shows the "new UPI" field directly (placeholder: name@okicici …). */
  await page.getByPlaceholder(/name@okicici/i).fill('testuser@okaxis')

  /* ── 7. Submit withdrawal request ── */
  await page.getByRole('button', { name: /submit withdrawal/i }).click()

  /* ── 8. Assert breakdown appears ── */
  // Success state: "Withdrawal initiated" heading
  await expect(page.getByText(/withdrawal initiated/i)).toBeVisible({ timeout: 15_000 })
  // Gross amount label is present
  await expect(page.getByText('Gross amount')).toBeVisible()
  // Net payout: ₹950 (5% TDS on ₹1,000)
  await expect(page.getByText('₹950')).toBeVisible()

  /* ── 9. Go back and check pending in history ── */
  const makeAnotherBtn = page.getByRole('button', { name: /make another withdrawal/i })
  if (await makeAnotherBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await makeAnotherBtn.click()
  } else {
    await page.goto('/app/withdraw')
  }

  // Past withdrawals section shows Pending status badge
  await expect(page.getByText(/past withdrawals/i)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Pending')).toBeVisible({ timeout: 10_000 })
})

test('withdraw: UPI toggle hidden when amount exceeds ₹5,000', async ({ page }) => {
  const email = uniqueEmail('upi-limit')
  const { user } = await register({ name: 'UPI Limit User', email, password: 'testpass1' })
  const adminToken = await adminLogin()
  await adminAdjustWallet(adminToken, user.id, 2_000_000, 'credit')

  // Login via UI
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill('testpass1')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

  await page.goto('/app/withdraw')
  await expect(page.getByText(/withdrawable balance/i)).toBeVisible({ timeout: 10_000 })

  // Enter ₹3,000 — UPI toggle should be visible
  const amountInput = page.getByLabel(/amount to withdraw in rupees/i)
  await amountInput.fill('3000')
  const upiToggle = page.getByRole('button', { name: /upi id/i })
  await expect(upiToggle).toBeVisible()

  // Enter ₹6,000 — UPI toggle should be hidden entirely (not rendered)
  await amountInput.fill('6000')
  await expect(upiToggle).not.toBeVisible()

  // Info message about UPI limit should appear
  await expect(page.getByText(/upi is unavailable/i)).toBeVisible()

  // Only Bank account option should be visible
  await expect(page.getByRole('button', { name: /bank account/i })).toBeVisible()
})

test('withdraw: silver user sees 5% TDS and the refer-more-for-lower-TDS hint', async ({ page }) => {
  // A freshly-registered user is silver with 0 referrals → TDS 5%, and should
  // be shown how many more referrals unlock Gold (3% TDS) and Diamond (0% TDS).
  const email = uniqueEmail('tds-hint')
  const { user } = await register({ name: 'TDS Hint User', email, password: 'testpass1' })
  const adminToken = await adminLogin()
  await adminAdjustWallet(adminToken, user.id, 1_000_000, 'credit', 'e2e seed balance')

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill('testpass1')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

  await page.goto('/app/withdraw')
  await expect(page.getByText(/withdrawable balance/i)).toBeVisible({ timeout: 10_000 })

  // Silver TDS rate is 5%, shown in the summary.
  await expect(page.getByText('TDS (5%)')).toBeVisible()

  // ₹1,000 at 5% TDS → net ₹950.
  await page.getByLabel(/amount to withdraw in rupees/i).fill('1000')
  await expect(page.getByText('₹950')).toBeVisible()

  // Upgrade incentive card + one line per higher tier.
  await expect(page.getByText(/pay less tds/i)).toBeVisible()
  await expect(
    page.getByText(/Refer 21 more to unlock Gold: TDS drops to 3% and returns rise to 30%/i).first()
  ).toBeVisible()
  await expect(
    page.getByText(/Refer 52 more to unlock Diamond: TDS drops to 0% and returns rise to 40%/i).first()
  ).toBeVisible()
})
