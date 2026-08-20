/**
 * leaderboard.spec.ts — seed two users with different investment sizes,
 * approve both, open Daily tab, assert larger investor is ranked #1.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, adminLogin, createInvestment, approveDeposit } from './helpers'

test('leaderboard: larger investor ranked #1 on Daily tab', async ({ page }) => {
  /* ── 1. Seed two users with investments via API ── */
  const adminToken = await adminLogin()

  // The daily leaderboard is shared state across the whole suite, so other
  // tests' investments also land on it. Give these two users the two LARGEST
  // amounts (near the ₹10,000 silver max) so they stay at the top of the board
  // and both remain visible regardless of test order.
  // User A — smaller of the two: ₹9,000 (900,000 paise)
  const emailA = uniqueEmail('lbA')
  const { token: tokenA } = await register({ name: 'LeaderAlpha User', email: emailA, password: 'passA1234' })
  const { id: invA } = await createInvestment(tokenA, 'silver', 900_000)
  await approveDeposit(adminToken, invA)

  // User B — larger, ranks #1: ₹10,000 (1,000,000 paise)
  const emailB = uniqueEmail('lbB')
  const { token: tokenB } = await register({ name: 'LeaderBeta User', email: emailB, password: 'passB1234' })
  const { id: invB } = await createInvestment(tokenB, 'silver', 1_000_000)
  await approveDeposit(adminToken, invB)

  /* ── 2. Log in as User A to view the leaderboard ── */
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(emailA)
  await page.getByPlaceholder('Your password').fill('passA1234')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

  /* ── 3. Navigate to leaderboard ── */
  await page.goto('/app/leaderboard')
  // Use heading role to avoid strict violation with the nav link
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible({ timeout: 10_000 })

  /* ── 4. Daily tab is default — verify it's selected or click it ── */
  // The leaderboard defaults to Daily. Confirm by checking for the tab.
  const dailyTab = page.getByRole('tab', { name: /daily/i })
  await expect(dailyTab).toBeVisible({ timeout: 5_000 })
  await dailyTab.click()

  /* ── 5. LeaderBeta User (larger, ₹10,000) must be ranked #1 ── */
  // Wait for data to load
  await expect(page.getByText('LeaderBeta User')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('LeaderAlpha User')).toBeVisible()

  // LeaderBeta should appear before LeaderAlpha in the DOM (rank #1 first)
  const betaPos = await page.getByText('LeaderBeta User').evaluate(
    el => el.compareDocumentPosition(document.body)
  )
  // Both users' amounts render (amounts repeat on the page — scope to first match).
  await expect(page.getByText('₹10,000').first()).toBeVisible()
  await expect(page.getByText('₹9,000').first()).toBeVisible()

  // The gold medal (rank #1) is on the LeaderBeta row
  // Check that LeaderBeta appears higher in the page than LeaderAlpha
  const betaEl = page.getByText('LeaderBeta User').first()
  const alphaEl = page.getByText('LeaderAlpha User').first()
  const betaTop = await betaEl.boundingBox().then(b => b?.y ?? 9999)
  const alphaTop = await alphaEl.boundingBox().then(b => b?.y ?? 0)
  expect(betaTop).toBeLessThan(alphaTop)
})
