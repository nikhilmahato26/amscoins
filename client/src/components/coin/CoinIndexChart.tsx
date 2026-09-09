import { useId, useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { useElementSize } from '@/hooks/useElementSize'
import {
  alignBodyParity,
  buildPriceTicks,
  buildTimeLabels,
  candleBodyWidth,
  formatTickMarkLabel,
  snapRect,
  wickWidth,
} from '@/lib/candleGeometry'
import { formatCoinPrice } from '@/lib/coinFormat'
import { cn } from '@/lib/utils'
import type { CoinCandle } from '@/services/api/coin'

// TradingView's own palette, not pure green/red — deliberately desaturated
// to reduce eye fatigue over a long viewing session. Exported so a brand
// change is a one-line edit rather than a grep across the component.
export const UP_COLOR = '#26A69A'
export const DOWN_COLOR = '#EF5350'

// Full-variant chrome. Kept as constants rather than props — every surface
// that wants a different gutter can wrap the chart in its own layout instead
// of this component growing a dozen sizing knobs.
const PRICE_AXIS_WIDTH = 58
const TIME_AXIS_HEIGHT = 24
const LABEL_HEIGHT = 18

// The price pills on the price axis (last price, and the crosshair's own),
// and the time pill under the crosshair. Shared so the geometry that has to
// avoid them uses the same numbers the pills are drawn with.
const BADGE_HEIGHT = 18
const TIME_BADGE_WIDTH = 40

/**
 * The ASM Coin index, as a candlestick chart. Hand-rolled SVG, following the
 * Sparkline pattern already in this codebase — a charting library would cost
 * more bundle than this entire feature.
 *
 * Body/wick sizing and axis tick spacing are ported from TradingView's
 * lightweight-charts (see @/lib/candleGeometry) — that's what makes this
 * read as a real terminal instead of a decorative sparkline wearing a
 * candlestick costume. The viewBox is the plot box's real measured pixel
 * size (via useElementSize), not a fixed number stretched with
 * `preserveAspectRatio="none"` — the ported geometry assumes a genuine 1:1
 * SVG-unit-to-pixel mapping, so a stretched viewBox would silently make
 * every width/parity calculation wrong.
 *
 * Layout is a column: the OHLC legend sits in normal flow ABOVE the plot and
 * the plot takes whatever height is left. The legend used to be absolutely
 * positioned over the top-left of the chart, which is fine at desktop width
 * and wrong at this project's 375px base — there the legend wraps to two
 * rows and paints straight over the candles and the last-price badge. Flow
 * layout means the reserved space is always exactly the legend's real
 * height, at any width, in any locale, without a wrap threshold to guess.
 *
 * `variant="compact"` (the default) is what today's home/hero surfaces show:
 * candles, the dashed current-price line, the pulsing live dot, nothing
 * else, and it stays `aria-hidden` — CoinPriceTicker announces the price as
 * live text elsewhere on the page. `variant="full"` is the admin/expanded
 * terminal view: price axis, time axis, grid, a last-price badge, an OHLC
 * legend, and a touch-friendly crosshair. Because `full` is genuinely
 * interactive it is NOT aria-hidden — it gets `role="img"` with a summary
 * label instead, and the per-candle detail stays visual-only.
 */
export function CoinIndexChart({
  series,
  positive = true,
  height = 160,
  className,
  showDot = true,
  variant = 'compact',
  rangeLabel,
}: {
  series: CoinCandle[]
  positive?: boolean
  height?: number
  className?: string
  showDot?: boolean
  variant?: 'compact' | 'full'
  /** Shown in the full variant's legend, e.g. "ASM · 1h". Omitted -> just "ASM". */
  rangeLabel?: string
}) {
  const gradientId = useId()
  const { ref, size } = useElementSize<HTMLDivElement>()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverY, setHoverY] = useState<number | null>(null)

  const isFull = variant === 'full'
  const width = size?.width ?? 0
  // The plot box's own measured height, not the `height` prop — the prop
  // sizes the whole column, of which the legend has already taken its share.
  const boxHeight = size?.height ?? 0

  // All pixel geometry in one place, recomputed only when the inputs that
  // actually affect it change — a crosshair pointermove re-renders this
  // component on every pixel of movement, and re-deriving candle rects from
  // scratch each time would be wasteful for no visual benefit.
  const geometry = useMemo(() => {
    if (!size || series.length < 1) return null

    const priceAxisWidth = isFull ? PRICE_AXIS_WIDTH : 0
    const timeAxisHeight = isFull ? TIME_AXIS_HEIGHT : 0
    const padY = isFull ? 8 : 6

    const plotWidth = Math.max(1, width - priceAxisWidth)
    const plotHeight = Math.max(1, boxHeight - timeAxisHeight)
    const innerHeight = Math.max(1, plotHeight - padY * 2)

    const highs = series.map((c) => c.h)
    const lows = series.map((c) => c.l)
    const min = Math.min(...lows)
    const max = Math.max(...highs)
    const span = max - min || 1

    const toY = (value: number) => padY + (1 - (value - min) / span) * innerHeight
    const fromY = (y: number) => min + (1 - (y - padY) / innerHeight) * span

    const barSpacing = plotWidth / series.length
    const rawBodyWidth = candleBodyWidth(barSpacing)
    const wickW = wickWidth(barSpacing, rawBodyWidth)
    const bodyWidth = alignBodyParity(rawBodyWidth, wickW)

    // Guard adjacent wicks against overlap the way lightweight-charts does:
    // each wick's left edge is clamped past the previous wick's right edge,
    // so dense charts never paint one wick over another.
    let prevWickRight = -Infinity
    const candles = series.map((candle, i) => {
      const centerX = (i + 0.5) * barSpacing
      const up = candle.c >= candle.o
      const yHigh = toY(candle.h)
      const yLow = toY(candle.l)
      const yOpen = toY(candle.o)
      const yClose = toY(candle.c)
      const bodyTop = Math.min(yOpen, yClose)
      const bodyBottom = Math.max(yOpen, yClose)

      const desiredWickLeft = centerX - wickW / 2
      const wickLeft = Math.max(desiredWickLeft, prevWickRight + 1)
      prevWickRight = wickLeft + wickW

      const snappedBodyTop = snapRect(bodyTop)
      const snappedBodyBottom = snapRect(bodyBottom)
      // Derived from the two already-snapped edges, not from re-rounding the
      // raw (bodyBottom - bodyTop) span independently — rounding a top and a
      // height separately can round them in different directions (e.g. top
      // 10.6→11, height 1.8→2 gives a body that spans 11-13 while the
      // snapped bottom is 12), leaving a 1px seam or overlap between the
      // body and the lower wick. A doji (o === c) still renders as a
      // visible 1px line via the floor.
      const bodyHeight = Math.max(1, snappedBodyBottom - snappedBodyTop)
      // The body's actual rendered bottom edge — equal to snappedBodyBottom
      // except when the 1px floor above kicked in, in which case the body
      // extends 1px further than snappedBodyBottom. The lower wick must
      // start there, not at snappedBodyBottom, or a near-doji candle gets
      // the exact same seam this whole block exists to prevent.
      const renderedBodyBottom = snappedBodyTop + bodyHeight

      return {
        candle,
        index: i,
        up,
        centerX,
        bodyX: snapRect(centerX - bodyWidth / 2),
        bodyY: snappedBodyTop,
        bodyWidth,
        bodyHeight,
        wickX: snapRect(wickLeft),
        wickWidth: wickW,
        // Two segments, not one line through the body — high→bodyTop and
        // bodyBottom→low — so the wick never paints behind the body fill.
        upperWickY: snapRect(yHigh),
        upperWickHeight: Math.max(0, snappedBodyTop - snapRect(yHigh)),
        lowerWickY: renderedBodyBottom,
        lowerWickHeight: Math.max(0, snapRect(yLow) - renderedBodyBottom),
      }
    })

    const last = series[series.length - 1]
    const lastY = toY(last.c)

    const priceTicks = isFull ? buildPriceTicks(max, min, innerHeight, LABEL_HEIGHT) : []
    // The grid keeps every tick; only the LABELS drop the ones the last-price
    // badge sits on. Two numbers printed on top of each other in the same
    // 58px gutter is the single most obviously-broken thing a price axis can
    // do, and the badge always wins — it carries the live price.
    //
    // The clearance is a full BADGE_HEIGHT between centres, not half of one:
    // a label is itself ~10px tall and centred on its own y, so it needs the
    // badge's 9px half-height PLUS its own ~5px half-height to clear. Half a
    // badge leaves a label 10px away still clipping the badge's top edge.
    const priceLabels = priceTicks.filter((tick) => Math.abs(toY(tick) - lastY) >= BADGE_HEIGHT)

    const times = series.map((c) => new Date(c.t))
    const timeLabels = isFull ? buildTimeLabels(times, barSpacing) : []

    return {
      priceAxisWidth,
      plotWidth,
      plotHeight,
      padY,
      innerHeight,
      toY,
      fromY,
      barSpacing,
      candles,
      priceTicks,
      priceLabels,
      timeLabels,
      last,
      lastY,
    }
  }, [size, series, width, boxHeight, isFull])

  if (series.length < 1) return null

  const dotColor = positive ? UP_COLOR : DOWN_COLOR

  // The legend reads straight from `series`, never from `geometry` — it must
  // render on the very first paint, before the plot has been measured, or
  // its height would arrive a frame late and the plot would be measured
  // against a legend that isn't there yet and then resize under the user.
  const legendIndex = hoverIndex !== null ? Math.min(hoverIndex, series.length - 1) : series.length - 1
  const legendCandle = series[legendIndex]
  const legendPrevClose = legendIndex > 0 ? series[legendIndex - 1].c : legendCandle.o
  const legendDelta = legendCandle.c - legendPrevClose
  const legendPct = legendPrevClose !== 0 ? (legendDelta / legendPrevClose) * 100 : 0
  const legendColor = legendCandle.c >= legendCandle.o ? UP_COLOR : DOWN_COLOR

  const overallOpen = series[0].o
  const lastClose = series[series.length - 1].c
  const overallChangePct = overallOpen !== 0 ? ((lastClose - overallOpen) / overallOpen) * 100 : 0
  const ariaLabel = `ASM Coin index chart. Current price ₹${formatCoinPrice(lastClose)}, ${
    overallChangePct >= 0 ? 'up' : 'down'
  } ${Math.abs(overallChangePct).toFixed(2)} percent over the shown period.`

  const updateHoverFromPointer = (e: ReactPointerEvent<SVGSVGElement>) => {
    const el = ref.current
    if (!el || !geometry) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const idx = Math.min(series.length - 1, Math.max(0, Math.floor(x / geometry.barSpacing)))
    const clampedY = Math.min(geometry.plotHeight - geometry.padY, Math.max(geometry.padY, y))
    setHoverIndex(idx)
    setHoverY(clampedY)
  }

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    // Keep receiving move events even if the finger drifts past the SVG's
    // edge mid-drag — without capture, a fast swipe drops the crosshair.
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Not every test/embed environment implements pointer capture.
      }
    }
    updateHoverFromPointer(e)
  }

  const handlePointerEnd = () => {
    setHoverIndex(null)
    setHoverY(null)
  }

  const crosshair =
    isFull && geometry && hoverIndex !== null && hoverY !== null ? geometry.candles[hoverIndex] : null
  // Centred on the candle, then pulled back inside the plot — at either end
  // of a dense chart the candle's centre is only a few pixels from the edge,
  // and an uncorrected badge hangs over the price axis or off the left side.
  const timeBadgeX = crosshair
    ? Math.max(0, Math.min(crosshair.centerX - TIME_BADGE_WIDTH / 2, geometry!.plotWidth - TIME_BADGE_WIDTH))
    : 0

  return (
    <div className={cn('flex w-full flex-col', className)} style={{ height }}>
      {isFull && (
        <div
          data-testid="coin-chart-legend"
          className="flex shrink-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-2 pb-1 pt-1.5 text-[11px] font-medium tabular-nums text-asm-body dark:text-skin-muted"
        >
          <span className="font-bold text-asm-navy dark:text-skin-text">ASM{rangeLabel ? ` · ${rangeLabel}` : ''}</span>
          <span>
            O <span style={{ color: legendColor }}>{formatCoinPrice(legendCandle.o)}</span>
          </span>
          <span>
            H <span style={{ color: legendColor }}>{formatCoinPrice(legendCandle.h)}</span>
          </span>
          <span>
            L <span style={{ color: legendColor }}>{formatCoinPrice(legendCandle.l)}</span>
          </span>
          <span data-testid="legend-close">
            C <span style={{ color: legendColor }}>{formatCoinPrice(legendCandle.c)}</span>
          </span>
          <span style={{ color: legendColor }}>
            {legendDelta >= 0 ? '+' : ''}
            {formatCoinPrice(Math.abs(legendDelta))} ({legendPct >= 0 ? '+' : ''}
            {legendPct.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* The measured element. Everything below is laid out against ITS box,
          so the legend above can be any height without moving a candle. */}
      <div ref={ref} className="relative min-h-0 w-full flex-1">
        {geometry && (
          <svg
            viewBox={`0 0 ${width} ${boxHeight}`}
            className={cn('size-full overflow-visible', isFull && 'touch-none')}
            {...(isFull
              ? { role: 'img', 'aria-label': ariaLabel }
              : { 'aria-hidden': true, focusable: false })}
            onPointerDown={isFull ? handlePointerDown : undefined}
            onPointerMove={isFull ? updateHoverFromPointer : undefined}
            onPointerUp={isFull ? handlePointerEnd : undefined}
            onPointerLeave={isFull ? handlePointerEnd : undefined}
            onPointerCancel={isFull ? handlePointerEnd : undefined}
          >
            {!isFull && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dotColor} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={dotColor} stopOpacity="0" />
                </linearGradient>
              </defs>
            )}

            {isFull && (
              <g aria-hidden="true">
                {/* Very low contrast — the grid orients, it must never compete
                    with the candles painted on top of it. */}
                {geometry.priceTicks.map((tick) => (
                  <line
                    key={`grid-y-${tick}`}
                    x1={0}
                    y1={geometry.toY(tick)}
                    x2={geometry.plotWidth}
                    y2={geometry.toY(tick)}
                    className="stroke-asm-line/70 dark:stroke-skin-line/70"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {geometry.timeLabels.map((label) => (
                  <line
                    key={`grid-x-${label.index}`}
                    x1={geometry.candles[label.index].centerX}
                    y1={0}
                    x2={geometry.candles[label.index].centerX}
                    y2={geometry.plotHeight}
                    className="stroke-asm-line/70 dark:stroke-skin-line/70"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            )}

            {!isFull && (
              // A faint fill under the close-price line gives the chart a floor
              // to sit on — the same role the old line chart's area fill played.
              <path
                d={`M0 ${boxHeight} ${series
                  .map((c, i) => `L${geometry.candles[i].centerX} ${geometry.toY(c.c)}`)
                  .join(' ')} L${width} ${boxHeight} Z`}
                fill={`url(#${gradientId})`}
              />
            )}

            {geometry.candles.map((c) => {
              const color = c.up ? UP_COLOR : DOWN_COLOR
              return (
                <g key={c.candle.t} data-testid="candle" data-direction={c.up ? 'up' : 'down'}>
                  {c.upperWickHeight > 0 && (
                    <rect
                      data-testid="candle-wick-upper"
                      x={c.wickX}
                      y={c.upperWickY}
                      width={c.wickWidth}
                      height={c.upperWickHeight}
                      fill={color}
                    />
                  )}
                  {c.lowerWickHeight > 0 && (
                    <rect
                      data-testid="candle-wick-lower"
                      x={c.wickX}
                      y={c.lowerWickY}
                      width={c.wickWidth}
                      height={c.lowerWickHeight}
                      fill={color}
                    />
                  )}
                  <rect
                    data-testid="candle-body"
                    x={c.bodyX}
                    y={c.bodyY}
                    width={c.bodyWidth}
                    height={c.bodyHeight}
                    fill={color}
                  />
                </g>
              )
            })}

            {/* Dashed current-price line, matching the "MID" reference line
                convention of a real trading terminal. */}
            <line
              x1={0}
              y1={geometry.lastY}
              x2={geometry.plotWidth}
              y2={geometry.lastY}
              stroke={dotColor}
              strokeWidth="1"
              strokeDasharray="4 4"
              strokeOpacity="0.55"
              vectorEffect="non-scaling-stroke"
            />

            {isFull && (
              <>
                {geometry.priceLabels.map((tick) => (
                  <text
                    key={`price-label-${tick}`}
                    data-testid="price-axis-label"
                    x={geometry.plotWidth + 6}
                    y={geometry.toY(tick)}
                    dominantBaseline="middle"
                    className="fill-asm-muted dark:fill-skin-muted text-[10px] tabular-nums"
                  >
                    {formatCoinPrice(tick)}
                  </text>
                ))}

                {geometry.timeLabels.map((label) => (
                  <text
                    key={`time-label-${label.index}`}
                    data-testid="time-axis-label"
                    x={geometry.candles[label.index].centerX}
                    y={geometry.plotHeight + 15}
                    textAnchor="middle"
                    className="fill-asm-muted dark:fill-skin-muted text-[10px] tabular-nums"
                  >
                    {formatTickMarkLabel(label.date, label.weight)}
                  </text>
                ))}

                {/* The last-price badge — a filled pill on the price axis. This
                    is the single strongest "real terminal" signal in the
                    reference: a plain axis label would not read as live. */}
                <g data-testid="price-badge">
                  <rect
                    x={geometry.plotWidth - 4}
                    y={geometry.lastY - BADGE_HEIGHT / 2}
                    width={geometry.priceAxisWidth + 4}
                    height={BADGE_HEIGHT}
                    rx={3}
                    fill={dotColor}
                  />
                  <text
                    x={geometry.plotWidth + geometry.priceAxisWidth / 2}
                    y={geometry.lastY}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="white"
                    className="text-[10px] font-semibold tabular-nums"
                  >
                    {formatCoinPrice(geometry.last.c)}
                  </text>
                </g>

                {crosshair && (
                  <g aria-hidden="true">
                    <line
                      x1={crosshair.centerX}
                      y1={0}
                      x2={crosshair.centerX}
                      y2={geometry.plotHeight}
                      className="stroke-asm-muted dark:stroke-skin-muted"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={0}
                      y1={hoverY as number}
                      x2={geometry.plotWidth}
                      y2={hoverY as number}
                      className="stroke-asm-muted dark:stroke-skin-muted"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                    <rect
                      data-testid="crosshair-price-badge"
                      x={geometry.plotWidth - 4}
                      y={(hoverY as number) - BADGE_HEIGHT / 2}
                      width={geometry.priceAxisWidth + 4}
                      height={BADGE_HEIGHT}
                      rx={3}
                      className="fill-asm-navy dark:fill-skin-surface"
                    />
                    <text
                      x={geometry.plotWidth + geometry.priceAxisWidth / 2}
                      y={hoverY as number}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      className="fill-white text-[10px] font-semibold tabular-nums"
                    >
                      {formatCoinPrice(Math.round(geometry.fromY(hoverY as number)))}
                    </text>
                    <rect
                      data-testid="crosshair-time-badge"
                      x={timeBadgeX}
                      y={geometry.plotHeight + 3}
                      width={TIME_BADGE_WIDTH}
                      height={16}
                      rx={3}
                      className="fill-asm-navy dark:fill-skin-surface"
                    />
                    <text
                      x={timeBadgeX + TIME_BADGE_WIDTH / 2}
                      y={geometry.plotHeight + 15}
                      textAnchor="middle"
                      className="fill-white text-[10px] tabular-nums"
                    >
                      {new Date(crosshair.candle.t).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </text>
                  </g>
                )}
              </>
            )}
          </svg>
        )}

        {showDot && !isFull && geometry && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(geometry.candles[geometry.candles.length - 1].centerX / width) * 100}%`,
              top: `${(geometry.lastY / boxHeight) * 100}%`,
            }}
          >
            <span className="relative flex size-3 items-center justify-center">
              <span
                className="coin-chart-pulse absolute size-5 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
              <span
                className="relative size-2.5 rounded-full ring-2 ring-white shadow-sm dark:ring-[#141416]"
                style={{ backgroundColor: dotColor }}
              />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
