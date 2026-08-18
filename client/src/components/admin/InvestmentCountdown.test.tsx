import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InvestmentCountdown } from './InvestmentCountdown'

describe('InvestmentCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
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
