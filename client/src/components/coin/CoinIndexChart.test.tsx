import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CoinIndexChart } from './CoinIndexChart'
import { formatCoinPrice } from '@/lib/coinFormat'

const series = [
  { t: '2026-09-09T10:00:00Z', p: 124780 },
  { t: '2026-09-09T10:01:00Z', p: 125200 },
  { t: '2026-09-09T10:02:00Z', p: 124100 },
  { t: '2026-09-09T10:03:00Z', p: 126000 },
]

describe('formatCoinPrice', () => {
  it('renders paise as a two-decimal rupee amount with thousands separators', () => {
    expect(formatCoinPrice(124780)).toBe('1,247.80')
  })

  it('pads a whole-rupee amount to two decimals', () => {
    expect(formatCoinPrice(100000)).toBe('1,000.00')
  })

  it('handles zero', () => {
    expect(formatCoinPrice(0)).toBe('0.00')
  })
})

describe('CoinIndexChart', () => {
  it('renders nothing when there are fewer than two points', () => {
    const { container } = render(<CoinIndexChart series={[series[0]]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('draws a path for a valid series', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    const paths = container.querySelectorAll('path')
    // One area fill, one line stroke.
    expect(paths.length).toBeGreaterThanOrEqual(2)
  })

  it('is hidden from assistive tech, since the price is announced separately', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})
