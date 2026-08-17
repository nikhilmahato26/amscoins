import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CommunityPage } from './CommunityPage'

// Isolate the page from AppShell's auth/router/query dependencies.
vi.mock('@/components/app/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('CommunityPage', () => {
  it('renders a join link per configured channel pointing at its env URL', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', 'https://instagram.com/asm')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'https://whatsapp.com/channel/x')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    render(<CommunityPage />)

    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute('href', 'https://instagram.com/asm')
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://whatsapp.com/channel/x')
    expect(screen.getByRole('link', { name: /telegram/i })).toHaveAttribute('href', 'https://t.me/asm')
  })

  it('opens each link in a new tab with a safe rel', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    render(<CommunityPage />)

    const link = screen.getByRole('link', { name: /telegram/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('shows an empty state and no links when nothing is configured', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', '')

    render(<CommunityPage />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })
})
