import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('NotificationBell', () => {
  it('renders badge count as sum of actionable items', async () => {
    wrap(<NotificationBell />)
    const badge = await screen.findByText('7')
    expect(badge).toBeInTheDocument()
  })
})
