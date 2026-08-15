/**
 * auth.spec.ts — registration, session persistence, and logout.
 *
 * The desktop SideNav has no sign-out button. Sign out lives on the Account page.
 * RequireAuth checks isLoading before redirecting, so we wait for the page to
 * fully hydrate before asserting the URL.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail } from './helpers'

test.describe('Auth flows', () => {
  test('register via UI → lands on /app, reload keeps session, logout → /login', async ({ page }) => {
    const email = uniqueEmail('auth')
    const password = 'testpass1'

    /* ── 1. Register via UI ── */
    await page.goto('/register')
    await expect(page).toHaveURL(/register/)

    await page.getByPlaceholder('Your full name').fill('E2E Tester')
    await page.getByPlaceholder('Enter your email').fill(email)
    await page.getByPlaceholder('Create a strong password').fill(password)
    await page.getByPlaceholder('Confirm your password').fill(password)
    await page.getByRole('button', { name: /sign up/i }).click()

    /* ── 2. Should land on /app ── */
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    /* ── 3. Reload keeps session — wait for full hydration ── */
    await page.reload()
    // Wait for the AuthContext /me check to complete (loading spinner disappears
    // or nav links become visible — sign the app fully hydrated)
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
    // Confirm app content loaded (nav link visible = auth passed)
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })

    /* ── 4. Logout via Account page ── */
    await page.goto('/app/account')
    // Wait for the account page to load (not redirect to login)
    await expect(page).toHaveURL(/\/app\/account/, { timeout: 10_000 })
    await page.getByRole('button', { name: /sign out/i }).click()

    /* ── 5. Should be at /login ── */
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
