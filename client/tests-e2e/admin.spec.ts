/**
 * admin.spec.ts — admin UI: login, view pending deposit, approve it,
 * deposit leaves the pending list.
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

  /* ── 3. Navigate to Deposits ── */
  await page.goto('/admin/deposits')
  // Use role heading to avoid strict violation with nav link
  await expect(page.getByRole('heading', { name: 'Deposits' })).toBeVisible({ timeout: 10_000 })

  /* ── 4. Assert the pending deposit is visible by its reference code ── */
  // Wait for skeleton loader to resolve (table fills with actual data)
  await expect(page.getByText(referenceCode)).toBeVisible({ timeout: 15_000 })

  /* ── 5. Click Approve on that deposit's row ── */
  // The Approve button is in the same table row as the reference code
  const depositRow = page.locator('tr').filter({ hasText: referenceCode })
  await depositRow.getByRole('button', { name: /approve/i }).click()

  /* ── 6. A confirmation dialog appears — confirm it ── */
  // The dialog has role="dialog" and another Approve button
  const confirmDialog = page.getByRole('dialog')
  if (await confirmDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmDialog.getByRole('button', { name: /approve/i }).click()
  }

  /* ── 7. Reference code is no longer in the pending list ── */
  await expect(page.getByText(referenceCode)).not.toBeVisible({ timeout: 15_000 })
})
