/**
 * admin-controls.spec.ts
 *
 * Browser coverage for the new admin controls:
 *   #5 — two on/off automation switches on /admin/settings
 *   #4 — the user's password shown on the user detail view
 *   #3 — approve / reject a running investment from the user detail view
 *   +  — a requested withdrawal stays out of the user's history until it's done
 *
 * Runs against the hermetic e2e server (in-memory Mongo, PASSWORD_ENC_KEY set).
 */
import { test, expect } from '@playwright/test'
import {
  uniqueEmail,
  register,
  adminLogin,
  approveDeposit,
  createWithdrawal,
  adminAdjustWallet,
} from './helpers'

const API = 'http://localhost:4000/api'

async function adminUILogin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
}

async function createInvestmentId(userToken: string, planKey: string, amountPaise: number) {
  const res = await fetch(`${API}/investments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ planKey, amount: amountPaise }),
  })
  if (!res.ok) throw new Error(`createInvestment failed ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.investment._id ?? data.investment.id
}

async function completeWithdrawal(adminToken: string, id: string) {
  const res = await fetch(`${API}/admin/withdrawals/${id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  if (!res.ok) throw new Error(`completeWithdrawal failed ${res.status}: ${await res.text()}`)
}

async function userWallet(token: string) {
  const res = await fetch(`${API}/wallet`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json()
}

// ── #5 — automation switches ────────────────────────────────────────────────

test('settings: both automation switches are shown with plain labels', async ({ page }) => {
  await adminUILogin(page)
  await page.goto('/admin/settings')
  await expect(page.getByText("Automatically reject investments that aren't paid in time")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Automatically pay users when their timer ends')).toBeVisible()
})

// ── #4 — password visible in the user view ──────────────────────────────────

test('user detail: shows the user password after tapping show', async ({ page }) => {
  const user = await register({ name: 'Pass View', email: uniqueEmail('pw'), password: 'userpass1' })

  await adminUILogin(page)
  await page.goto(`/admin/users/${user.user.id}`)

  await expect(page.getByText('Password', { exact: true })).toBeVisible({ timeout: 10_000 })
  // Masked by default, revealed on tap.
  await page.getByRole('button', { name: /show password/i }).click()
  await expect(page.getByText('userpass1')).toBeVisible()
})

// ── #3 — approve a running investment from the user view ─────────────────────

test('user detail: approve pays out a running investment', async ({ page }) => {
  const adminToken = await adminLogin()
  const user = await register({ name: 'Payout User', email: uniqueEmail('payout'), password: 'userpass1' })
  const invId = await createInvestmentId(user.token, 'silver', 200000)
  await approveDeposit(adminToken, invId) // pending → active

  page.on('dialog', (d) => d.accept()) // accept the confirm

  await adminUILogin(page)
  await page.goto(`/admin/users/${user.user.id}`)

  const approve = page.getByTestId('approve-payout')
  await expect(approve).toBeVisible({ timeout: 10_000 })
  await approve.click()

  // After paying out, the investment is done — the buttons disappear and a
  // confirmation shows.
  await expect(page.getByTestId('approve-payout')).toHaveCount(0, { timeout: 10_000 })
  // Confirmation banner (there's also an sr-only live-region copy — target the visible one).
  await expect(page.getByText(/Paid .* to Payout User/).last()).toBeVisible()
})

// ── withdrawal stays hidden from user history until completed ────────────────

test('a requested withdrawal is hidden from the user until an admin completes it', async ({ page }) => {
  const adminToken = await adminLogin()
  const user = await register({ name: 'WD User', email: uniqueEmail('wd'), password: 'userpass1' })
  await adminAdjustWallet(adminToken, user.user.id, 200000, 'credit')

  const wd = await createWithdrawal(user.token, { amount: 100000, upiId: 'x@upi' })

  // Not visible while pending.
  let wallet = await userWallet(user.token)
  expect(wallet.balance).toBe(100000)
  expect(wallet.transactions.some((t: { type: string }) => t.type === 'withdrawal')).toBe(false)

  // Admin completes → now visible as settled.
  await completeWithdrawal(adminToken, wd._id)
  wallet = await userWallet(user.token)
  const wtxn = wallet.transactions.find((t: { type: string }) => t.type === 'withdrawal')
  expect(wtxn).toBeTruthy()
  expect(wtxn.status).toBe('settled')

  void page
})

// ── reject a running investment with a custom amount (trace kept) ────────────

test('user detail: reject credits a custom amount to the user', async ({ page }) => {
  const adminToken = await adminLogin()
  const user = await register({ name: 'Reject User', email: uniqueEmail('rej'), password: 'userpass1' })
  const invId = await createInvestmentId(user.token, 'silver', 200000)
  await approveDeposit(adminToken, invId) // pending → active

  await adminUILogin(page)
  await page.goto(`/admin/users/${user.user.id}`)

  await page.getByTestId('reject-payout').click()
  const dialog = page.getByRole('dialog', { name: /reject investment/i })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  await dialog.getByRole('spinbutton').fill('500') // ₹500 credited back
  await dialog.getByRole('button', { name: /^reject$/i }).click()

  // Buttons disappear once it's rejected.
  await expect(page.getByTestId('reject-payout')).toHaveCount(0, { timeout: 10_000 })

  // The custom credit is real and visible in the user's wallet/history.
  const wallet = await userWallet(user.token)
  expect(wallet.balance).toBe(50000) // ₹500 in paise
  expect(wallet.transactions.some((t: { amount: number }) => t.amount === 50000)).toBe(true)
})

// ── delete erases the whole cycle from the user's side ───────────────────────

test('user detail: delete erases a running investment (kept in admin History)', async ({ page }) => {
  const adminToken = await adminLogin()
  const user = await register({ name: 'Delete User', email: uniqueEmail('del'), password: 'userpass1' })
  const invId = await createInvestmentId(user.token, 'silver', 200000)
  await approveDeposit(adminToken, invId) // active

  page.on('dialog', (d) => d.accept()) // accept the delete confirm
  await adminUILogin(page)
  await page.goto(`/admin/users/${user.user.id}`)

  const del = page.getByTestId('delete-investment')
  await expect(del).toBeVisible({ timeout: 10_000 })
  await del.click()
  await expect(page.getByTestId('delete-investment')).toHaveCount(0, { timeout: 10_000 })

  // User side: no trace of it.
  const mine = await fetch(`${API}/investments`, { headers: { Authorization: `Bearer ${user.token}` } }).then((r) => r.json())
  expect(mine.some((i: { _id: string }) => i._id === invId)).toBe(false)

  // Admin History: kept, marked 'deleted'.
  const hist = await fetch(`${API}/admin/investments?status=deleted`, { headers: { Authorization: `Bearer ${adminToken}` } }).then((r) => r.json())
  expect(hist.some((i: { _id: string; status: string }) => i._id === invId && i.status === 'deleted')).toBe(true)
})

// ── auto-reject countdown column on the pending Investments tab ───────────────

test('investments tab: pending rows show an auto-reject countdown when auto-reject is on', async ({ page }) => {
  const user = await register({ name: 'Auto User', email: uniqueEmail('auto'), password: 'userpass1' })
  await createInvestmentId(user.token, 'silver', 200000) // stays pending

  await adminUILogin(page)
  await page.goto('/admin/investments')
  await expect(page.getByRole('heading', { name: 'Investments' })).toBeVisible({ timeout: 10_000 })

  // Auto-reject defaults ON → the column header and a live countdown cell show.
  await expect(page.getByRole('columnheader', { name: 'Auto reject' })).toBeVisible()
  await expect(page.getByTestId('auto-reject-countdown').first()).toBeVisible()
})
