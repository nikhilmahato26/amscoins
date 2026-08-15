/**
 * invest.spec.ts — plan selection, payment confirmation, admin-approve flow.
 *
 * Silver plan: min ₹1,000 (100,000 paise), max ₹10,000 (1,000,000 paise).
 * Gold plan: requires 11 referrals → shows a locked div with "Unlock with 11 referrals".
 *
 * PackageDetailPage shows preset amount buttons (Entry ₹1,000 / Starter ₹5,000 / …)
 * and a "Custom Amount" link that reveals a number input. We use the preset.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, adminLogin, approveDeposit, createInvestment } from './helpers'

test.describe('Investment flow', () => {
  test('pick Silver plan → payment page shows reference code + Telegram link', async ({ page }) => {
    const email = uniqueEmail('invest')
    const password = 'investpass1'

    /* ── 1. Register + login via UI ── */
    await page.goto('/register')
    await page.getByPlaceholder('Your full name').fill('Invest Tester')
    await page.getByPlaceholder('Enter your email').fill(email)
    await page.getByPlaceholder('Create a strong password').fill(password)
    await page.getByPlaceholder('Confirm your password').fill(password)
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    /* ── 2. Go to Plans page ── */
    await page.goto('/plans')
    await expect(page.getByRole('heading', { name: /choose your growth path/i })).toBeVisible({ timeout: 10_000 })

    /* ── 3. Assert Gold shows locked state ── */
    // Gold card has a locked <div> with text "Unlock with 11 referrals" (not a <button>)
    await expect(page.getByText(/unlock with 11 referrals/i)).toBeVisible({ timeout: 10_000 })

    /* ── 4. Click Silver's "INVEST NOW" button ── */
    // aria-label="Invest in the Silver plan"
    await page.getByRole('button', { name: /invest in the silver plan/i }).click()

    /* ── 5. Select amount on PackageDetailPage ── */
    // PackageDetailPage shows preset amount cards (Entry ₹1,000 already selected by default).
    // Click "Continue to Payment" button directly — ₹1,000 is the default selected amount.
    await expect(page).toHaveURL(/\/app\/invest/, { timeout: 10_000 })
    // Wait for the preset amount cards to load
    await expect(page.getByText(/select investment/i)).toBeVisible({ timeout: 10_000 })
    // The "Entry" preset (₹1,000) is pre-selected — just continue
    await page.getByRole('button', { name: /continue to payment/i }).click()

    /* ── 6. Should reach summary page ── */
    await expect(page).toHaveURL(/\/app\/summary/, { timeout: 10_000 })

    /* ── 7. Proceed to payment ── */
    await page.getByRole('button', { name: /proceed to payment/i }).click()
    await expect(page).toHaveURL(/\/app\/payment/, { timeout: 10_000 })

    /* ── 8. Confirm / submit investment ── */
    const confirmBtn = page.getByRole('button', { name: /confirm|pay now|proceed|submit/i }).first()
    if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    /* ── 9. Assert reference code (ASM-…) + Telegram link appear ── */
    await expect(page.getByText(/ASM-/)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /telegram/i })).toBeVisible({ timeout: 10_000 })
  })

  test('admin-approve deposit → dashboard shows investment data', async ({ page }) => {
    const email = uniqueEmail('approve')
    const password = 'approvepass1'

    /* ── 1. Register user + create investment via API ── */
    const { user, token } = await register({ name: 'Approve User', email, password })
    const { id: investmentId } = await createInvestment(token, 'silver', 200_000)

    /* ── 2. Admin approves via API ── */
    const adminToken = await adminLogin()
    await approveDeposit(adminToken, investmentId)

    /* ── 3. Log in as user via UI ── */
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    /* ── 4. Dashboard shows ₹ amounts (investment credited) ── */
    await page.goto('/app/dashboard')
    await expect(page.locator('body')).toContainText('₹', { timeout: 10_000 })
  })
})
