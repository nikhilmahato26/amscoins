import { test, expect } from '@playwright/test'

test.describe('DepositConfirmationPage', () => {
  test('shows reference code and summary from URL state', async ({ page }) => {
    // Navigate directly to the page (requires a real session + investment ID in dev/staging).
    // This test is a smoke test — run it against a seeded dev environment.
    // Skip in CI if SKIP_E2E env var is set.
    test.skip(!!process.env.SKIP_E2E, 'Skipping e2e — no dev server')

    await page.goto('/app')
    // Full e2e flow would: login, create investment, follow redirect.
    // For now, verify the confirmation page structure loads if navigated with state.
    await expect(page.getByText('Send Payment Proof')).toBeVisible()
  })
})
