import { afterAll, beforeAll, describe, it, expect } from 'vitest'

import {
  alignBodyParity,
  buildPriceTicks,
  buildTimeLabels,
  candleBodyWidth,
  priceTickSpan,
  snapLine,
  snapRect,
  tickMarkWeight,
  wickWidth,
} from './candleGeometry'
import { formatCoinPrice } from './coinFormat'

describe('candleBodyWidth', () => {
  it('returns a fixed 3px in the 2.5–4 special-case band', () => {
    expect(candleBodyWidth(2.5)).toBe(3)
    expect(candleBodyWidth(3)).toBe(3)
    expect(candleBodyWidth(4)).toBe(3)
  })

  it('trends toward roughly 100% of spacing when spacing is small', () => {
    // Below the special-case band, coeff is 1 — width tracks spacing closely.
    expect(candleBodyWidth(2)).toBe(2)
  })

  it('trends toward roughly 80% of spacing as spacing grows large', () => {
    const spacing = 100
    const width = candleBodyWidth(spacing)
    const ratio = width / spacing
    expect(ratio).toBeGreaterThan(0.75)
    expect(ratio).toBeLessThan(0.85)
  })

  it('never exceeds the bar spacing outside the fixed-3px special-case band', () => {
    // Inside [2.5, 4] the width is intentionally pinned to 3px regardless of
    // spacing (see the special-case test above), so it can legitimately
    // exceed a spacing of 2.5–2.9 there — this checks the general branch.
    for (const spacing of [1, 2, 4, 10, 50, 200]) {
      expect(candleBodyWidth(spacing)).toBeLessThanOrEqual(Math.floor(spacing))
    }
  })

  it('never goes below 1px, even at sub-pixel spacing', () => {
    expect(candleBodyWidth(0.3)).toBeGreaterThanOrEqual(1)
  })
})

describe('wickWidth', () => {
  it('never exceeds the body width', () => {
    for (const spacing of [1, 3, 10, 50]) {
      const body = candleBodyWidth(spacing)
      expect(wickWidth(spacing, body)).toBeLessThanOrEqual(body)
    }
  })

  it('never goes below 1px at pixelRatio 1', () => {
    expect(wickWidth(0.5, candleBodyWidth(0.5))).toBeGreaterThanOrEqual(1)
  })
})

describe('alignBodyParity', () => {
  it('leaves body width unchanged when wick and body already share parity', () => {
    expect(alignBodyParity(4, 2)).toBe(4) // both even
    expect(alignBodyParity(5, 1)).toBe(5) // both odd
  })

  it('shrinks the body by 1px when parities differ and body is at least 2px', () => {
    expect(alignBodyParity(4, 1)).toBe(3) // even body, odd wick
    expect(alignBodyParity(5, 2)).toBe(4) // odd body, even wick
  })

  it('leaves a sub-2px body alone even when parities differ', () => {
    expect(alignBodyParity(1, 2)).toBe(1)
  })
})

describe('snapping', () => {
  it('snapLine lands a 1px stroke on a half-pixel, never straddling two device pixels', () => {
    expect(snapLine(10.4)).toBe(10.5)
    expect(snapLine(10.6)).toBe(11.5)
  })

  it('snapRect rounds to the nearest whole pixel', () => {
    expect(snapRect(10.4)).toBe(10)
    expect(snapRect(10.6)).toBe(11)
  })
})

describe('priceTickSpan', () => {
  it('yields a human "nice" span, never a raw range/n division like 3.7', () => {
    // high=1260, low=1240 -> range 20, maxTickSpan ~= 4 -> nice span is 2.5 or 5.
    const span = priceTickSpan(1260, 1240, 4)
    expect([2.5, 5]).toContain(span)
  })

  it('never returns a span smaller than the requested maxTickSpan cycle allows', () => {
    const span = priceTickSpan(2000, 1000, 50)
    expect(span).toBeGreaterThanOrEqual(50)
  })

  it('never returns a span below 1 — prices are integer paise, so sub-paise ticks cannot be distinguished', () => {
    // A near-flat 2-paise range with a generous axis would otherwise
    // compute a 0.5-paise span, producing two ticks that round to the same
    // integer paise value and so format identically.
    const span = priceTickSpan(124782, 124780, (124782 - 124780) * 18 / 160)
    expect(span).toBeGreaterThanOrEqual(1)
  })

  it('never produces two price ticks that format identically via formatCoinPrice', () => {
    const high = 124782
    const low = 124780
    const ticks = buildPriceTicks(high, low, 160, 18)
    const labels = ticks.map(formatCoinPrice)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('buildPriceTicks', () => {
  // Deliberately not round multiples of any "nice" span, unlike a plotted
  // high/low which is itself a candle extreme — real chart data won't line
  // up on a tick boundary, so this exercises the open-interval case.
  const HIGH = 125734
  const LOW = 124061

  it('returns strictly descending values', () => {
    const ticks = buildPriceTicks(HIGH, LOW, 300, 18)
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeLessThan(ticks[i - 1])
    }
  })

  it('returns values strictly inside [low, high]', () => {
    const ticks = buildPriceTicks(HIGH, LOW, 300, 18)
    for (const t of ticks) {
      expect(t).toBeGreaterThan(LOW)
      expect(t).toBeLessThan(HIGH)
    }
  })

  it('never crowds two labels closer than labelHeight in pixels', () => {
    const high = HIGH
    const low = LOW
    const axisHeight = 300
    const labelHeight = 18
    const ticks = buildPriceTicks(high, low, axisHeight, labelHeight)
    const toY = (v: number) => (1 - (v - low) / (high - low)) * axisHeight
    const ys = ticks.map(toY)
    for (let i = 1; i < ys.length; i++) {
      expect(Math.abs(ys[i] - ys[i - 1])).toBeGreaterThanOrEqual(labelHeight)
    }
  })

  it('returns an empty array when high does not exceed low', () => {
    expect(buildPriceTicks(100, 100, 300)).toEqual([])
    expect(buildPriceTicks(90, 100, 300)).toEqual([])
  })
})

describe('tickMarkWeight', () => {
  it('ranks a day boundary above an hour boundary', () => {
    const prevDay = new Date('2026-09-08T23:50:00Z')
    const crossesDay = new Date('2026-09-09T00:10:00Z')
    const crossesHour = new Date('2026-09-09T01:10:00Z')
    const staysWithinHour = new Date('2026-09-09T01:15:00Z')

    const dayWeight = tickMarkWeight(crossesDay, prevDay)
    const hourWeight = tickMarkWeight(crossesHour, staysWithinHour)
    expect(dayWeight).toBeGreaterThan(hourWeight)
  })

  it('ranks an hour boundary above a minute boundary', () => {
    const hourBoundary = tickMarkWeight(new Date('2026-09-09T11:00:00Z'), new Date('2026-09-09T10:50:00Z'))
    const minuteBoundary = tickMarkWeight(new Date('2026-09-09T10:31:00Z'), new Date('2026-09-09T10:30:30Z'))
    expect(hourBoundary).toBeGreaterThan(minuteBoundary)
  })

  it('ranks a year boundary above a month boundary', () => {
    const yearWeight = tickMarkWeight(new Date('2027-01-01T00:00:00Z'), new Date('2026-12-31T00:00:00Z'))
    const monthWeight = tickMarkWeight(new Date('2026-10-01T00:00:00Z'), new Date('2026-09-30T00:00:00Z'))
    expect(yearWeight).toBeGreaterThan(monthWeight)
  })

  it('returns 0 when no boundary at all is crossed (identical instants)', () => {
    const t = new Date('2026-09-09T10:30:00.500Z')
    expect(tickMarkWeight(t, t)).toBe(0)
  })

  describe('local (not epoch) boundary flooring', () => {
    // India is UTC+05:30 — a half-hour offset from UTC, so flooring raw
    // epoch ms puts "hour" boundaries at the local half-hour instead of the
    // real wall-clock hour. Pinned here so the assertion holds regardless
    // of the machine running the test, not just on one that happens to run
    // in IST already.
    let originalTZ: string | undefined

    beforeAll(() => {
      originalTZ = process.env.TZ
      process.env.TZ = 'Asia/Kolkata'
    })

    afterAll(() => {
      process.env.TZ = originalTZ
    })

    it('ranks the true on-the-hour crossing (10:55→11:00 IST) above an epoch-only artifact (10:25→10:30 IST)', () => {
      // Constructed as local (unqualified) ISO date-times, so under the
      // pinned Asia/Kolkata zone these parse as exactly 10:55/11:00/10:25/
      // 10:30 IST wall-clock time.
      const trueHourCrossing = tickMarkWeight(new Date('2026-09-09T11:00:00'), new Date('2026-09-09T10:55:00'))
      const epochOnlyArtifact = tickMarkWeight(new Date('2026-09-09T10:30:00'), new Date('2026-09-09T10:25:00'))
      expect(trueHourCrossing).toBeGreaterThan(epochOnlyArtifact)
    })
  })
})

describe('buildTimeLabels', () => {
  it('never places two labels closer together than indexPerLabel candles', () => {
    // 60 one-minute candles at a tight bar spacing, so indexPerLabel > 1.
    const times = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 8, 9, 10, i)))
    const barSpacing = 6 // px per candle — forces several candles per label
    const labels = buildTimeLabels(times, barSpacing, 11)

    const pixelsPer8Characters = (11 + 4) * 5
    const indexPerLabel = Math.max(1, Math.round(pixelsPer8Characters / barSpacing))

    for (let i = 1; i < labels.length; i++) {
      expect(labels[i].index - labels[i - 1].index).toBeGreaterThanOrEqual(indexPerLabel)
    }
  })

  it('prefers the higher-weight boundary candle over its lower-weight neighbours', () => {
    // 10:20, 10:30, ..., 11:00, 11:10 — 11:00 crosses the hour and should
    // win a label slot even under spacing that would otherwise skip it.
    const times = [0, 10, 20, 30, 40, 50, 60, 70].map((min) => new Date(Date.UTC(2026, 8, 9, 10, min)))
    const labels = buildTimeLabels(times, 8, 11)
    const labelledIndexes = labels.map((l) => l.index)
    expect(labelledIndexes).toContain(6) // 11:00 — the candle that crosses the hour boundary
  })

  it('returns nothing for an empty series', () => {
    expect(buildTimeLabels([], 10)).toEqual([])
  })
})
