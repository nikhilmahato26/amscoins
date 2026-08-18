import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InvestmentCountdown } from './InvestmentCountdown'

describe('InvestmentCountdown', () => {
  // Pin the clock so the delta between building `maturesAt` and the component's
  // Date.now() read is exact (no wall-clock slippage on a slow CI runner).
  beforeEach(() => vi.useFakeTimers({ now: new Date('2025-01-01T00:00:00Z') }))
  afterEach(() => vi.useRealTimers())

  it('renders a reverse HH:MM:SS timer for a future maturity', () => {
    const maturesAt = new Date(Date.now() + 3661_000).toISOString() // 1h 1m 1s
    render(<InvestmentCountdown maturesAt={maturesAt} />)
    expect(screen.getByText('01:01:01')).toBeInTheDocument()
  })

  it('shows "Matured" once the target has passed', () => {
    const maturesAt = new Date(Date.now() - 1000).toISOString()
    render(<InvestmentCountdown maturesAt={maturesAt} />)
    expect(screen.getByText('Matured')).toBeInTheDocument()
  })
})
