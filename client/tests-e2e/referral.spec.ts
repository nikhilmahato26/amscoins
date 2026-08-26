/**
 * referral.spec.ts — a referral link (/?ref=CODE) must carry the visitor to
 * the register screen with the code pre-filled and applied, not drop them on
 * the marketing home. It then proves the full journey: a real referrer's code,
 * carried through the link, records the referred user on the backend.
 */
import { test, expect } from '@playwright/test'
import { register, referralOverview, uniqueEmail } from './helpers'

test.describe('Referral link', () => {
  test('/?ref=CODE redirects to /register with the code pre-filled and applied', async ({ page }) => {
    // Lowercase on purpose: RegisterPage uppercases the referral input.
    await page.goto('/?ref=azzxsn')

    // Landed on register, query string carried through.
    await expect(page).toHaveURL(/\/register\?ref=azzxsn/, { timeout: 10_000 })

    // The referral-code input (placeholder "USER010") is pre-filled, uppercased.
    await expect(page.getByPlaceholder('USER010')).toHaveValue('AZZXSN')

    // The applied-confirmation is shown.
    await expect(page.getByText(/referral code applied/i)).toBeVisible()
  })

  test('referral page shows link above code and has a share button', async ({ page }) => {
    const email = uniqueEmail('refpage')
    await register({ name: 'Ref Page User', email, password: 'testpass1' })

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill('testpass1')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    await page.goto('/app/referral')
    await expect(page.getByText(/tier progression/i)).toBeVisible({ timeout: 10_000 })

    // Link label and code label both visible
    const linkLabel = page.getByText('Your referral link')
    const codeLabel = page.getByText('Your referral code')
    await expect(linkLabel).toBeVisible()
    await expect(codeLabel).toBeVisible()

    // Share button is present
    await expect(page.getByLabel(/share referral link/i)).toBeVisible()
  })

  test('full journey: a real code carried through the link records the referral', async ({ page }) => {
    // Arrange: a referrer exists; capture the code the app would put in their link.
    const referrer = await register({
      name: 'Referrer Rita',
      email: uniqueEmail('referrer'),
      password: 'testpass1',
    })
    const code = referrer.user.referralCode
    expect(code).toMatch(/^[A-Z2-9]{6}$/) // sanity: real, uppercase code

    // Act 1: visit the referral link the app hands out.
    await page.goto(`/?ref=${code}`)
    await expect(page).toHaveURL(new RegExp(`/register\\?ref=${code}`), { timeout: 10_000 })
    await expect(page.getByPlaceholder('USER010')).toHaveValue(code)
    await expect(page.getByText(/referral code applied/i)).toBeVisible()

    // Act 2: the referred visitor completes registration.
    await page.getByPlaceholder('Your full name').fill('Referred Ravi')
    await page.getByPlaceholder('Enter your email').fill(uniqueEmail('referred'))
    await page.getByPlaceholder('Create a strong password').fill('testpass1')
    await page.getByPlaceholder('Confirm your password').fill('testpass1')
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    // Assert: backend recorded the referral (referredBy set) under the referrer.
    // `count` stays 0 until the referred user's first approved deposit; the
    // registration-time signal we care about is membership in `referrals`.
    const overview = await referralOverview(referrer.token)
    expect(overview.referrals.map((r) => r.name)).toContain('Referred Ravi')
  })

  test('referral page shows the new tier thresholds (gold@21, diamond@52)', async ({ page }) => {
    const email = uniqueEmail('refthresh')
    await register({ name: 'Threshold User', email, password: 'testpass1' })

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill('testpass1')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    await page.goto('/app/referral')
    await expect(page.getByText(/tier progression/i)).toBeVisible({ timeout: 10_000 })

    // Level Requirements cards reflect the new unlock counts.
    await expect(page.getByText(/unlock with 21 referrals/i)).toBeVisible()
    await expect(page.getByText(/unlock with 52 referrals/i)).toBeVisible()

    // Tier stepper member ranges (en-dash matched loosely with `.`).
    await expect(page.getByText(/21.51 members/).first()).toBeVisible()
    await expect(page.getByText(/52\+ members/).first()).toBeVisible()

    // A fresh user (0 referrals) is progressing toward Gold at 21.
    await expect(page.getByText('0/21').first()).toBeVisible()
  })
})
