import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvestmentStatsBar } from './InvestmentStatsBar'

vi.mock('@/hooks/queries', () => ({
  useInvestmentStats: vi.fn(() => ({
    data: {
      pendingApprovals: 3,
      returnsAwaiting: 1,
      aboutToComplete: 2,
      capitalUnderManagement: 500000, // ₹5,000
      approvalRate: 85,
      revenueThisMonth: 100000, // ₹1,000
    },
    isLoading: false,
  })),
}))

describe('InvestmentStatsBar', () => {
  it('renders 6 stat labels', () => {
    render(<InvestmentStatsBar />)
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
    expect(screen.getByText('Returns Awaiting')).toBeInTheDocument()
    expect(screen.getByText('About to Complete')).toBeInTheDocument()
    expect(screen.getByText('Capital Under Mgmt')).toBeInTheDocument()
    expect(screen.getByText('Approval Rate')).toBeInTheDocument()
    expect(screen.getByText('Revenue This Month')).toBeInTheDocument()
  })
})
