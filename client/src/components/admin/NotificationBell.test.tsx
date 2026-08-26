import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationBell } from './NotificationBell'

vi.mock('@/services/api/admin', () => ({
  getInvestmentStats: vi.fn().mockResolvedValue({
    pendingApprovals: 4,
    returnsAwaiting: 2,
    aboutToComplete: 1,
    capitalUnderManagement: 0,
    approvalRate: null,
    revenueThisMonth: 0,
  }),
}))

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NotificationBell', () => {
  it('renders badge count as sum of actionable items', async () => {
    wrap(<NotificationBell />)
    const badge = await screen.findByText('7')
    expect(badge).toBeInTheDocument()
  })

  it('opens a breakdown menu listing each actionable category on click', async () => {
    wrap(<NotificationBell />)
    await screen.findByText('7')
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }))
    const menu = await screen.findByRole('menu', { name: 'Pending admin actions' })
    expect(menu).toBeInTheDocument()
    expect(screen.getByText('Pending approvals')).toBeInTheDocument()
    expect(screen.getByText('Returns awaiting')).toBeInTheDocument()
    expect(screen.getByText('About to complete')).toBeInTheDocument()
  })
})
