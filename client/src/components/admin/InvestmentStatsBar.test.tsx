import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvestmentStatsBar } from './InvestmentStatsBar'

vi.mock('@/services/api/admin', () => ({
  getInvestmentStats: vi.fn().mockResolvedValue({
    pendingApprovals: 3,
    returnsAwaiting: 1,
    aboutToComplete: 2,
    capitalUnderManagement: 500000,
    approvalRate: 85,
    revenueThisMonth: 100000,
  }),
}))

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('InvestmentStatsBar', () => {
  it('renders 6 stat labels', async () => {
    wrap(<InvestmentStatsBar />)
    expect(await screen.findByText('Pending Approvals')).toBeInTheDocument()
    expect(screen.getByText('Returns Awaiting')).toBeInTheDocument()
    expect(screen.getByText('About to Complete')).toBeInTheDocument()
    expect(screen.getByText('Capital Under Mgmt')).toBeInTheDocument()
    expect(screen.getByText('Approval Rate')).toBeInTheDocument()
    expect(screen.getByText('Revenue This Month')).toBeInTheDocument()
  })
})
