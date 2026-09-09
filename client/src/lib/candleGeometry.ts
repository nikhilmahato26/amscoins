/**
 * Pure candlestick chart geometry. No React, no DOM — every function here
 * takes plain numbers/dates and returns plain numbers, so it can be
 * unit-tested exhaustively and reused by both the compact and full chart
 * variants.
 *
 * The body/wick sizing and the price-axis tick spacing are ported verbatim
 * from TradingView's `lightweight-charts` (the reference this chart is
 * modelled on) — the constants below are tuned by that library's own
 * authors, not derived from first principles, so they are kept exactly as
 * found rather than "simplified".
 */

// ─── Candle body / wick sizing (ported from optimalCandlestickWidth) ───────

/**
 * How wide a candle's body should be, in pixels, for a given spacing between
 * candle centres. Below ~2.5px of spacing there's no room to taper, so the
 * body is fixed at 3px; above 4px it eases toward 80% of the spacing (never
 * a full block, so adjacent candles stay visually separated even when dense).
 */
export function candleBodyWidth(barSpacing: number, pixelRatio = 1): number {
  const SPECIAL_FROM = 2.5
  const SPECIAL_TO = 4
  if (barSpacing >= SPECIAL_FROM && barSpacing <= SPECIAL_TO) {
    return Math.floor(3 * pixelRatio)
  }
  // coeff is 1 at small bar spacing and trends toward 0.8 as spacing grows.
  const coeff = 1 - (0.2 * Math.atan(Math.max(SPECIAL_TO, barSpacing) - SPECIAL_TO)) / (Math.PI * 0.5)
  const res = Math.floor(barSpacing * coeff * pixelRatio)
  const scaled = Math.floor(barSpacing * pixelRatio)
  return Math.max(Math.floor(pixelRatio), Math.min(res, scaled))
}

/** How wide a candle's wick should be — always thin, never wider than the body. */
export function wickWidth(barSpacing: number, bodyWidth: number, pixelRatio = 1): number {
  const w = Math.min(Math.floor(pixelRatio), Math.floor(barSpacing * pixelRatio))
  return Math.max(Math.floor(pixelRatio), Math.min(w, bodyWidth))
}

/**
 * TradingView's own comment on this rule: "grid and crosshair have line
 * width = floor(pixelRatio); if this value is odd, we have to make
 * candlesticks' width odd, if even, even, in order of keeping
 * crosshair-over-candlesticks drawing symmetric." Apply after computing body
 * width — if the parities differ, shrink the body by 1px so the wick sits
 * exactly on the body's centre line instead of 0.5px off it.
 */
export function alignBodyParity(bodyWidth: number, wickW: number): number {
  if (bodyWidth >= 2 && wickW % 2 !== bodyWidth % 2) return bodyWidth - 1
  return bodyWidth
}

// ─── Snapping — 1px strokes must land ON a device pixel, not straddle two ──

export const snapLine = (v: number) => Math.round(v) + 0.5
export const snapRect = (v: number) => Math.round(v)

// ─── Price axis (ported from PriceTickSpanCalculator) ──────────────────────

/**
 * The "nice" spacing between price-axis ticks. Nice numbers come from
 * repeatedly dividing a power-of-ten decade by a cycling [2, 2.5, 2] divider
 * list (10 → 5 → 2 → 1 → 0.5 → ...), never from `range / tickCount` — that
 * naive division produces spans like 4.7 or 13 that no real terminal shows.
 */
export function priceTickSpan(high: number, low: number, maxTickSpan: number): number {
  const dividers = [2, 2.5, 2] // one full cycle divides by 10
  let span = Math.pow(10, Math.max(0, Math.ceil(Math.log10(high - low || 1))))
  let i = 0
  while (span >= maxTickSpan * dividers[i % dividers.length] && span > 1e-14) {
    span /= dividers[i % dividers.length]
    i++
  }
  // The source's minMovement floor: it never proposes a span finer than the
  // smallest value the data can actually represent. Here that's 1 — every
  // price is integer paise, so a sub-paise span (e.g. 0.5) is not a real
  // step between two prices, it's just two ticks landing on the same
  // integer and formatting to the same label. Without this floor a
  // near-flat high/low range (a couple of paise apart) produces duplicate
  // axis labels.
  return Math.max(1, span)
}

/**
 * The price-axis tick values (not pixel coordinates — callers map value → y
 * with their own scale). Walks down from the highest multiple of `span` at
 * or below `high`, skipping any tick whose y-coordinate would land within
 * `labelHeight` of the previously accepted one, so labels never overlap.
 */
export function buildPriceTicks(high: number, low: number, axisHeight: number, labelHeight = 18): number[] {
  if (!(high > low) || axisHeight <= 0) return []

  // Ticks must never sit closer together than a label is tall — this is
  // what `maxTickSpan` enforces before priceTickSpan even runs.
  const maxTickSpan = ((high - low) * labelHeight) / axisHeight
  const span = priceTickSpan(high, low, maxTickSpan)
  const toY = (value: number) => (1 - (value - low) / (high - low)) * axisHeight

  const ticks: number[] = []
  let prevY: number | null = null
  for (let v = high - (high % span); v > low; v -= span) {
    const y = toY(v)
    if (prevY === null || Math.abs(y - prevY) >= labelHeight) {
      ticks.push(v)
      prevY = y
    }
  }
  return ticks
}

// ─── Time axis (ported from time-scale-point-weight-generator + time-scale) ─

// Intraday boundaries, coarsest to finest. A candle's weight is the coarsest
// one it crosses relative to the previous candle — this list's length also
// sizes the weight scale used below (day/month/year sit above it).
const INTRADAY_DIVISORS_MS = [
  12 * 60 * 60 * 1000, // 12h
  6 * 60 * 60 * 1000, // 6h
  3 * 60 * 60 * 1000, // 3h
  60 * 60 * 1000, // 1h
  30 * 60 * 1000, // 30m
  5 * 60 * 1000, // 5m
  60 * 1000, // 1m
  1000, // 1s
]

const DAY_WEIGHT = INTRADAY_DIVISORS_MS.length + 1
const MONTH_WEIGHT = INTRADAY_DIVISORS_MS.length + 2
const YEAR_WEIGHT = INTRADAY_DIVISORS_MS.length + 3

// getTime() is epoch (UTC) milliseconds — flooring it directly only lines up
// with real clock boundaries in a UTC-aligned timezone. India is UTC+05:30,
// a half-hour offset, so epoch hour boundaries fall on the local half-hour
// (e.g. epoch-floor treats 10:25→10:30 IST as crossing an "hour" boundary,
// not 10:55→11:00). Shifting by each date's own offset before flooring
// makes the comparison local-clock-correct; using the date's own offset
// rather than one shared value is what keeps this right across a DST
// transition too — India has none, but the rule is free either way.
const localMs = (d: Date) => d.getTime() - d.getTimezoneOffset() * 60_000

/**
 * How significant a calendar boundary `current` crosses relative to `prev` —
 * ported from lightweight-charts' time-scale-point-weight-generator. Higher
 * is coarser: a year change outranks every month change, which outranks
 * every day change, which outranks the intraday divisors from 12h down to
 * 1s. This is the whole reason a real terminal's time axis can show "11:00"
 * more prominently than the "10:50"/"10:40" either side of it — 11:00 is the
 * one that crosses an hour boundary, so it wins the label slot there.
 */
export function tickMarkWeight(current: Date, prev: Date): number {
  if (current.getFullYear() !== prev.getFullYear()) return YEAR_WEIGHT
  if (current.getMonth() !== prev.getMonth()) return MONTH_WEIGHT
  if (current.getDate() !== prev.getDate()) return DAY_WEIGHT

  const prevLocal = localMs(prev)
  const currentLocal = localMs(current)
  for (let i = 0; i < INTRADAY_DIVISORS_MS.length; i++) {
    const divisor = INTRADAY_DIVISORS_MS[i]
    if (Math.floor(prevLocal / divisor) !== Math.floor(currentLocal / divisor)) {
      return INTRADAY_DIVISORS_MS.length - i
    }
  }
  return 0
}

export interface TimeLabel {
  index: number
  date: Date
  weight: number
}

/**
 * Which candles get a time-axis label, and in what order of importance.
 * Ported from time-scale.ts `marks()`: labels are placed highest-weight
 * first (a day boundary always wins its slot over a same-tier hour
 * boundary), each accepted only if it sits at least `indexPerLabel` candles
 * from every label already accepted — never evenly spaced by index alone,
 * because evenly-spaced labels would routinely miss the boundary that
 * actually matters (a fresh hour, a fresh day) in favour of an arbitrary
 * "every 20th candle".
 */
export function buildTimeLabels(times: Date[], barSpacing: number, fontSize = 11): TimeLabel[] {
  if (times.length === 0 || barSpacing <= 0) return []

  // A label needs roughly 8 characters' width ("10:30" or "9 Sep" both fit);
  // this is lightweight-charts' own estimate, not a per-string measurement.
  const pixelsPer8Characters = (fontSize + 4) * 5
  const maxLabelWidth = (pixelsPer8Characters / 8) * 8
  const indexPerLabel = Math.max(1, Math.round(maxLabelWidth / barSpacing))

  const candidates: TimeLabel[] = times.map((date, index) => ({
    index,
    date,
    weight: index === 0 ? 0 : tickMarkWeight(date, times[index - 1]),
  }))

  // Highest weight first; index breaks ties so equal-weight candidates are
  // considered in chart order rather than depending on sort stability.
  const byWeightDesc = [...candidates].sort((a, b) => b.weight - a.weight || a.index - b.index)

  const accepted: TimeLabel[] = []
  for (const candidate of byWeightDesc) {
    const tooClose = accepted.some((a) => Math.abs(a.index - candidate.index) < indexPerLabel)
    if (!tooClose) accepted.push(candidate)
  }

  return accepted.sort((a, b) => a.index - b.index)
}

/**
 * Format a label BY the boundary it won its slot for, not by the chart's
 * range — ported from default-tick-mark-formatter.ts. A candle that only
 * crossed a minute boundary is stamped "10:30" even on a 7d chart; a candle
 * that happens to cross midnight is stamped "9" even on a 1h chart.
 */
export function formatTickMarkLabel(date: Date, weight: number): string {
  if (weight === YEAR_WEIGHT) return String(date.getFullYear())
  if (weight === MONTH_WEIGHT) return date.toLocaleDateString('en-US', { month: 'short' })
  if (weight === DAY_WEIGHT) return String(date.getDate())
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}
