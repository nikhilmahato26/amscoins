import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CoinIndexChart, DOWN_COLOR, UP_COLOR } from './CoinIndexChart'
import { formatCoinPrice } from '@/lib/coinFormat'

const series = [
  { t: '2026-09-09T10:00:00Z', o: 124780, h: 125300, l: 124500, c: 125200 }, // up
  { t: '2026-09-09T10:01:00Z', o: 125200, h: 125600, l: 123900, c: 124100 }, // down
  { t: '2026-09-09T10:02:00Z', o: 124100, h: 126200, l: 124000, c: 126000 }, // up
  { t: '2026-09-09T10:03:00Z', o: 126000, h: 126800, l: 125200, c: 124900 }, // down
  { t: '2026-09-09T10:04:00Z', o: 124900, h: 125100, l: 124700, c: 125050 }, // up (last)
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

describe('CoinIndexChart (compact)', () => {
  it('renders nothing for an empty series', () => {
    const { container } = render(<CoinIndexChart series={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders one candle group per series entry', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    expect(container.querySelectorAll('[data-testid="candle"]')).toHaveLength(series.length)
  })

  it("colors each candle's body by its own open/close, independent of the positive prop", () => {
    const { container } = render(<CoinIndexChart series={series} positive={false} />)
    const bodies = container.querySelectorAll('[data-testid="candle-body"]')
    expect(bodies[0].getAttribute('fill')).toBe(UP_COLOR) // candle 0: close > open
    expect(bodies[1].getAttribute('fill')).toBe(DOWN_COLOR) // candle 1: close < open
  })

  it('renders a doji (open === close) as a visible body, never a vanished one', () => {
    const doji = [{ t: '2026-09-09T10:00:00Z', o: 124780, h: 125000, l: 124600, c: 124780 }]
    const { container } = render(<CoinIndexChart series={doji} />)
    const body = container.querySelector('[data-testid="candle-body"]')
    expect(body).not.toBeNull()
    expect(Number(body?.getAttribute('height'))).toBeGreaterThanOrEqual(1)
  })

  it('renders a single candle without crashing', () => {
    const { container } = render(<CoinIndexChart series={[series[0]]} />)
    expect(container.querySelectorAll('[data-testid="candle"]')).toHaveLength(1)
  })

  it('is hidden from assistive tech, since the price is announced separately', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders neither price-axis labels nor a last-price badge', () => {
    const { container } = render(<CoinIndexChart series={series} />)
    expect(container.querySelectorAll('[data-testid="price-axis-label"]')).toHaveLength(0)
    expect(container.querySelector('[data-testid="price-badge"]')).toBeNull()
  })

  it('keeps the body flush against both wicks after pixel snapping — no seam or overlap', () => {
    // Every candle here has a genuine, non-trivial gap above and below the
    // body (h strictly above max(o,c), l strictly below min(o,c)), so both
    // wick segments render for all five and the invariant is checkable end
    // to end. Rounding a body's top and height independently (the original
    // bug) can round them in different directions and leave the lower wick
    // starting inside the body, or a 1px gap before it.
    const invariantSeries = [
      { t: '2026-09-09T10:00:00Z', o: 124780, h: 125300, l: 124500, c: 125200 },
      { t: '2026-09-09T10:01:00Z', o: 125200, h: 125650, l: 123900, c: 124100 },
      { t: '2026-09-09T10:02:00Z', o: 124100, h: 126200, l: 123950, c: 126000 },
      { t: '2026-09-09T10:03:00Z', o: 126000, h: 126800, l: 124850, c: 124900 },
      { t: '2026-09-09T10:04:00Z', o: 124900, h: 125130, l: 124700, c: 125050 },
    ]
    const { container } = render(<CoinIndexChart series={invariantSeries} />)
    const bodies = container.querySelectorAll('[data-testid="candle-body"]')
    const upperWicks = container.querySelectorAll('[data-testid="candle-wick-upper"]')
    const lowerWicks = container.querySelectorAll('[data-testid="candle-wick-lower"]')
    expect(bodies).toHaveLength(invariantSeries.length)
    expect(upperWicks).toHaveLength(invariantSeries.length)
    expect(lowerWicks).toHaveLength(invariantSeries.length)

    for (let i = 0; i < invariantSeries.length; i++) {
      const bodyY = Number(bodies[i].getAttribute('y'))
      const bodyHeight = Number(bodies[i].getAttribute('height'))
      const upperWickY = Number(upperWicks[i].getAttribute('y'))
      const upperWickHeight = Number(upperWicks[i].getAttribute('height'))
      const lowerWickY = Number(lowerWicks[i].getAttribute('y'))

      // Upper wick ends exactly where the body starts.
      expect(upperWickY + upperWickHeight).toBe(bodyY)
      // Body ends exactly where the lower wick starts.
      expect(bodyY + bodyHeight).toBe(lowerWickY)
    }
  })
})

describe('CoinIndexChart (full)', () => {
  it('is not aria-hidden — it carries role="img" with a summary label instead', () => {
    const { container } = render(<CoinIndexChart series={series} variant="full" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBeNull()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders price-axis labels and a last-price badge', () => {
    const { container } = render(<CoinIndexChart series={series} variant="full" />)
    expect(container.querySelectorAll('[data-testid="price-axis-label"]').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-testid="price-badge"]')).not.toBeNull()
  })

  it('shows the last candle in the OHLC legend at rest', () => {
    const { getByTestId } = render(<CoinIndexChart series={series} variant="full" />)
    const last = series[series.length - 1]
    expect(getByTestId('legend-close').textContent).toContain(formatCoinPrice(last.c))
  })

  it('updates the OHLC legend to the hovered candle on pointermove, and restores the last candle on pointerleave', () => {
    const { container, getByTestId } = render(<CoinIndexChart series={series} variant="full" height={200} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()

    // The stubbed ResizeObserver (src/test/setup.ts) always reports a 400px
    // width; variant="full" reserves 58px for the price axis, so plotWidth
    // is 342px and barSpacing is 342/5 = 68.4px. x=170 falls in candle
    // index 2's slot (136.8–205.2).
    fireEvent.pointerMove(svg as Element, { clientX: 170, clientY: 100 })
    expect(getByTestId('legend-close').textContent).toContain(formatCoinPrice(series[2].c))

    fireEvent.pointerLeave(svg as Element)
    const last = series[series.length - 1]
    expect(getByTestId('legend-close').textContent).toContain(formatCoinPrice(last.c))
  })
})

describe('CoinIndexChart (full) — chrome must never cover the plot', () => {
  // The stubbed ResizeObserver (src/test/setup.ts) reports the measured
  // element as 400x160 regardless of what the wrapper asks for, which is
  // exactly what makes the first assertion below meaningful.
  const PLOT_WIDTH = 400 - 58 // measured width minus the price axis

  const makeSeries = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      t: new Date(Date.UTC(2026, 8, 9, 10, i)).toISOString(),
      o: 124800 + i,
      h: 125300 + i,
      l: 124500 + i,
      c: 125000 + i,
    }))

  it('sizes the plot from the measured plot box, not from the wrapper height', () => {
    // The legend sits in flow above the plot and takes its own natural
    // height; the SVG gets what remains. Under the stub that remainder is
    // reported as 160 whatever `height` says, so a viewBox height of 160
    // under height={400} proves the geometry follows the measured plot box.
    // That is the mechanism that keeps a two-row legend (what a 375px base
    // produces) from being painted over the candles.
    const { container } = render(<CoinIndexChart series={series} variant="full" height={400} />)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 400 160')
  })

  it('renders the OHLC legend above the plot in flow, never floating over it', () => {
    const { container, getByTestId } = render(<CoinIndexChart series={series} variant="full" />)
    const legend = getByTestId('coin-chart-legend')
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(legend.className).not.toContain('absolute')
    // eslint-disable-next-line no-bitwise
    expect(legend.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('drops any price-axis label the last-price badge would clip', () => {
    // Lows bottom out at 124000 and highs top out at 126000, which yields a
    // 500-paise tick span — ticks at 126000 / 125500 / 125000 / 124500, 30px
    // apart down the axis. The last candle closes at 124800, which puts the
    // badge's centre 12px below the 125000 tick: far enough apart that the
    // two CENTRES don't collide, close enough that the label's own box runs
    // under the badge's top edge. Clearing only half a badge height leaves
    // exactly this label clipped, so this is the case that pins the rule.
    const badgeSeries = [
      { t: '2026-09-09T10:00:00Z', o: 124500, h: 126000, l: 124000, c: 125000 },
      { t: '2026-09-09T10:01:00Z', o: 125000, h: 125800, l: 124200, c: 124800 },
    ]
    const { container } = render(<CoinIndexChart series={badgeSeries} variant="full" />)

    const badge = container.querySelector('[data-testid="price-badge"] rect') as SVGRectElement
    const badgeTop = Number(badge.getAttribute('y'))
    const badgeBottom = badgeTop + Number(badge.getAttribute('height'))

    const labels = [...container.querySelectorAll('[data-testid="price-axis-label"]')]
    expect(labels).toHaveLength(3) // 125000 is the one the badge covers

    // A label is ~10px of type centred on its own y, so its box — not just
    // its centre — has to clear the badge.
    const LABEL_HALF_HEIGHT = 5
    for (const label of labels) {
      const y = Number(label.getAttribute('y'))
      expect(y + LABEL_HALF_HEIGHT < badgeTop || y - LABEL_HALF_HEIGHT > badgeBottom).toBe(true)
    }
  })

  it('keeps the crosshair time badge inside the plot at the right edge', () => {
    // 40 candles over a 342px plot is 8.55px of bar spacing, so the last
    // candle's centre sits 4px from the plot's right edge — a 40px badge
    // centred there would hang 16px into the price axis.
    const many = makeSeries(40)
    const { container, getByTestId } = render(<CoinIndexChart series={many} variant="full" />)
    const svg = container.querySelector('svg') as SVGSVGElement

    fireEvent.pointerMove(svg, { clientX: 341, clientY: 60 })
    const badge = getByTestId('crosshair-time-badge')
    const x = Number(badge.getAttribute('x'))
    expect(x + Number(badge.getAttribute('width'))).toBeLessThanOrEqual(PLOT_WIDTH)
  })

  it('keeps the crosshair time badge inside the plot at the left edge', () => {
    const many = makeSeries(40)
    const { container, getByTestId } = render(<CoinIndexChart series={many} variant="full" />)
    const svg = container.querySelector('svg') as SVGSVGElement

    fireEvent.pointerMove(svg, { clientX: 1, clientY: 60 })
    expect(Number(getByTestId('crosshair-time-badge').getAttribute('x'))).toBeGreaterThanOrEqual(0)
  })
})
