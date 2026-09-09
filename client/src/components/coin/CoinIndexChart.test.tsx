import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CoinIndexChart } from './CoinIndexChart'
import { formatCoinPrice } from '@/lib/coinFormat'

const series = [
  { t: '2026-09-09T10:00:00Z', o: 124780, h: 125300, l: 124500, c: 125200 },
  { t: '2026-09-09T10:01:00Z', o: 125200, h: 125600, l: 123900, c: 124100 },
  { t: '2026-09-09T10:02:00Z', o: 124100, h: 126200, l: 124000, c: 126000 },
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
  it('renders nothing for an empty series', () => {
    const { container } = render(<CoinIndexChart series={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('draws a candle (wick + body) per data point, plus the close-price fill and dashed reference line', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    expect(container.querySelectorAll('rect')).toHaveLength(series.length) // one body per candle
    // One wick line per candle, plus the dashed current-price line.
    expect(container.querySelectorAll('line')).toHaveLength(series.length + 1)
    expect(container.querySelectorAll('path')).toHaveLength(1) // the area-under-close fill
  })

  it('colors each candle by its own open/close, not by the positive prop', () => {
    const { container } = render(<CoinIndexChart series={series} positive={false} />)
    const rects = container.querySelectorAll('rect')
    // Candle 0: close > open → up color. Candle 1: close < open → down color.
    expect(rects[0].getAttribute('fill')).toBe('#17A34A')
    expect(rects[1].getAttribute('fill')).toBe('#DC2626')
  })

  it('renders a single candle without crashing', () => {
    const { container } = render(<CoinIndexChart series={[series[0]]} />)
    expect(container.querySelectorAll('rect')).toHaveLength(1)
  })

  it('is hidden from assistive tech, since the price is announced separately', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})
