/**
 * admin-withdrawal-destination.spec.ts — the admin Withdrawals table must show
 * bank account + IFSC for bank payouts and the VPA for UPI payouts.
 */
import { test, expect } from '@playwright/test'
import {
  uniqueEmail,
  register,
  adminLogin,
  adminAdjustWallet,
  createWithdrawal,
} from './helpers'

test('admin withdrawals: bank payout shows account + IFSC, UPI shows VPA', async ({ page }) => {
  const adminToken = await adminLogin()

  // Seed a BANK withdrawal
  const bank = await register({
    name: 'Bank Payout User',
    email: uniqueEmail('wd-bank'),
    password: 'userpass1',
  })
  await adminAdjustWallet(adminToken, bank.user.id, 1_000_000, 'credit', 'e2e seed')
  await createWithdrawal(bank.token, {
    amount: 100_000,
    accountName: 'Bank Payout User',
    accountNumber: '000123456789',
    ifsc: 'HDFC0001234',
  })

  // Seed a UPI withdrawal
  const upi = await register({
    name: 'Upi Payout User',
    email: uniqueEmail('wd-upi'),
    password: 'userpass1',
  })
  await adminAdjustWallet(adminToken, upi.user.id, 1_000_000, 'credit', 'e2e seed')
  await createWithdrawal(upi.token, { amount: 100_000, upiId: '9876543210@paytm' })

  // Admin logs in via UI
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  await page.goto('/admin/withdrawals')
  await expect(page.getByRole('heading', { name: 'Withdrawals' })).toBeVisible({ timeout: 10_000 })

  // BANK row: account number, IFSC and BANK badge all visible (no blank cell)
  const bankRow = page.locator('tr').filter({ hasText: 'Bank Payout User' })
  await expect(bankRow.getByText('000123456789')).toBeVisible({ timeout: 15_000 })
  await expect(bankRow.getByText('HDFC0001234')).toBeVisible()
  await expect(bankRow.getByText('BANK', { exact: true })).toBeVisible()

  // UPI row still shows the VPA and the UPI badge
  const upiRow = page.locator('tr').filter({ hasText: 'Upi Payout User' })
  await expect(upiRow.getByText('9876543210@paytm')).toBeVisible()
  await expect(upiRow.getByText('UPI', { exact: true })).toBeVisible()
})

test('admin withdrawals: mark-paid dialog shows the bank destination, not "via UPI"', async ({ page }) => {
  const adminToken = await adminLogin()

  const bank = await register({
    name: 'Dialog Bank User',
    email: uniqueEmail('wd-dlg'),
    password: 'userpass1',
  })
  await adminAdjustWallet(adminToken, bank.user.id, 1_000_000, 'credit', 'e2e seed')
  await createWithdrawal(bank.token, {
    amount: 100_000,
    accountName: 'Dialog Bank User',
    accountNumber: '000987654321',
    ifsc: 'ICIC0004321',
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  await page.goto('/admin/withdrawals')
  const row = page.locator('tr').filter({ hasText: 'Dialog Bank User' })
  await expect(row.getByText('000987654321')).toBeVisible({ timeout: 15_000 })
  await row.getByRole('button', { name: /mark paid/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('000987654321')).toBeVisible()
  await expect(dialog.getByText('ICIC0004321')).toBeVisible()
  await expect(dialog.getByText(/via UPI/i)).toHaveCount(0)
})
