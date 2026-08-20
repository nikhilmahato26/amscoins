/**
 * admin.spec.ts — admin UI: login, view a pending deposit on the Investments
 * board, approve it, and confirm it leaves the pending (Investments) tab.
 *
 * Note: pending deposits live on /admin/investments (Investments tab); the old
 * standalone /admin/deposits route was removed in the board refactor.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, createInvestment } from './helpers'

test('admin: login, approve pending deposit, deposit leaves pending list', async ({ page }) => {
  /* ── 1. Seed a pending deposit via API ── */
  const email = uniqueEmail('admintest')
  const { token } = await register({ name: 'Admin Test User', email, password: 'userpass1' })
  const { referenceCode } = await createInvestment(token, 'silver', 200_000)

  /* ── 2. Admin logs in via UI ── */
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()

  // Admin should redirect to /admin
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  /* ── 3. Navigate to the Investments board (pending deposits live here) ── */
  await page.goto('/admin/investments')
  await expect(page.getByRole('heading', { name: 'Investments' })).toBeVisible({ timeout: 10_000 })

  /* ── 4. Assert the pending deposit is visible by its reference code ── */
  const depositRow = page.locator('tr').filter({ hasText: referenceCode })
  await expect(depositRow).toBeVisible({ timeout: 15_000 })

  /* ── 5. Click Approve on that deposit's row ── */
  await depositRow.getByTestId('approve-investment').click()

  /* ── 6. A confirmation dialog appears — confirm it ── */
  const confirmDialog = page.getByRole('dialog')
  await expect(confirmDialog).toBeVisible({ timeout: 5_000 })
  await confirmDialog.getByRole('button', { name: /^approve$/i }).click()
  await expect(confirmDialog).not.toBeVisible({ timeout: 10_000 })

  /* ── 7. The deposit is approved: it's now 'active' and stays on the board,
     but its pending-only Approve button is gone. ── */
  await expect(depositRow.getByTestId('approve-investment')).toHaveCount(0, { timeout: 15_000 })
})
