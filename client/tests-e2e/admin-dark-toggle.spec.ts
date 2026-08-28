import { test, expect } from '@playwright/test'

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/admin**', { timeout: 15_000 })
  // Wait for the admin shell to mount
  await page.waitForSelector('.theme-light-home, .app-shell-dark', { timeout: 10_000 })
}

test.describe('Admin dark toggle — desktop sidebar', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('sidebar toggle visible, panel starts in light mode', async ({ page }) => {
    await loginAdmin(page)

    // The root AdminLayout div has theme-light-home or app-shell-dark
    const root = page.locator('.theme-light-home').first()
    await expect(root).toBeVisible()

    // SkyToggle inside the aside (desktop sidebar)
    const toggle = page.locator('aside label.theme-switch').first()
    await expect(toggle).toBeVisible()

    await page.screenshot({ path: 'tests-e2e/screenshots/admin-light-desktop.png' })
  })

  test('clicking sidebar toggle switches to dark mode', async ({ page }) => {
    await loginAdmin(page)

    const toggle = page.locator('aside label.theme-switch').first()
    await expect(toggle).toBeVisible()
    await toggle.click()

    // Root div should now carry app-shell-dark; wait for View Transition to finish
    await expect(page.locator('.app-shell-dark').first()).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'tests-e2e/screenshots/admin-dark-desktop.png' })
  })

  test('clicking toggle twice returns to light mode', async ({ page }) => {
    await loginAdmin(page)
    const toggle = page.locator('aside label.theme-switch').first()
    await toggle.click()
    await expect(page.locator('.app-shell-dark').first()).toBeVisible()
    await toggle.click()
    await expect(page.locator('.theme-light-home').first()).toBeVisible()
  })
})

test.describe('Admin dark toggle — mobile header', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('mobile header toggle visible, panel starts light', async ({ page }) => {
    await loginAdmin(page)

    const toggle = page.locator('header label.theme-switch').first()
    await expect(toggle).toBeVisible()

    await page.screenshot({ path: 'tests-e2e/screenshots/admin-light-mobile.png' })
  })

  test('clicking mobile header toggle switches to dark mode', async ({ page }) => {
    await loginAdmin(page)

    const toggle = page.locator('header label.theme-switch').first()
    await toggle.click()

    await expect(page.locator('.app-shell-dark').first()).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'tests-e2e/screenshots/admin-dark-mobile.png' })
  })
})

test.describe('Admin dark toggle — mobile drawer', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('SkyToggle visible in mobile drawer footer', async ({ page }) => {
    await loginAdmin(page)

    await page.getByRole('button', { name: /open menu/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 })

    const toggle = page.locator('[role="dialog"] label.theme-switch').first()
    await expect(toggle).toBeVisible()
    // Wait for the spring animation to settle
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests-e2e/screenshots/admin-drawer-light.png' })
  })
})
