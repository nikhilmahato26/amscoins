/**
 * admin-support.spec.ts — admin resolves a support ticket using a quick reply preset.
 */
import { test, expect } from '@playwright/test'
import { uniqueEmail, register, createSupportTicket } from './helpers'

test('admin: resolve support ticket with quick reply preset', async ({ page }) => {
  // Seed: create a user and a support ticket
  const email = uniqueEmail('support')
  const { token } = await register({ name: 'Support User', email, password: 'testpass1' })
  await createSupportTicket(token, 'Cannot withdraw', 'My withdrawal is stuck')

  // Admin login
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  // Navigate to support
  await page.goto('/admin/support')
  await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible({ timeout: 10_000 })

  // Wait for the ticket to appear in the open list
  await expect(page.getByText('Cannot withdraw')).toBeVisible({ timeout: 10_000 })

  // Click the Resolve button on the ticket row (not the "Resolved" filter tab)
  await page.getByRole('button', { name: /^resolve$/i }).click()

  // Dialog appears with quick reply buttons
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 5_000 })

  // Click a quick reply preset
  const preset = dialog.getByRole('button', { name: /resolved.*check/i })
  await expect(preset).toBeVisible()
  await preset.click()

  // Textarea should be filled with the preset text
  const textarea = dialog.locator('textarea')
  await expect(textarea).toHaveValue(/resolved/)

  // Submit
  await dialog.getByRole('button', { name: /mark resolved/i }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10_000 })
})
