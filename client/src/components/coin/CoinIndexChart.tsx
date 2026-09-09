import { useId } from 'react'

import { cn } from '@/lib/utils'
import type { CoinCandle } from '@/services/api/coin'

const UP_COLOR = '#17A34A'
const DOWN_COLOR = '#DC2626'

/**
 * The ASM Coin index, as a candlestick chart. Hand-rolled SVG, following the
 * Sparkline pattern already in this codebase — a charting library would cost
 * more bundle than this entire feature.
 *
 * Each candle is one bucket of several real price ticks (see server
 * coinIndexService#bucketOHLC), so the wick is genuine intra-bucket
 * high/low, not decoration — that's what makes it read as a real market
 * chart instead of a smoothed line pretending to be one.
 *
 * The chart is decorative and aria-hidden: the price and change are announced
 * as live text by CoinPriceTicker, so a screen reader gets the information
 * without having to interpret it.
 */
export function CoinIndexChart({
  series,
  positive = true,
  height = 160,
  className,
  showDot = true,
}: {
  series: CoinCandle[]
  positive?: boolean
  height?: number
  className?: string
  showDot?: boolean
}) {
  const gradientId = useId()

  if (series.length < 1) return null

  // A fixed viewBox with preserveAspectRatio="none" lets the SVG stretch to any
  // container width without recalculating on resize.
  const width = 600
  const pad = 6
  const innerHeight = height - pad * 2

  const highs = series.map((c) => c.h)
  const lows = series.map((c) => c.l)
  const min = Math.min(...lows)
  const max = Math.max(...highs)
  const span = max - min || 1

  const toY = (value: number) => pad + (1 - (value - min) / span) * innerHeight

  const slot = width / series.length
  const bodyWidth = Math.max(1, slot * 0.62)

  const last = series[series.length - 1]
  const lastX = (series.length - 0.5) * slot
  const lastY = toY(last.c)
  const dotColor = positive ? UP_COLOR : DOWN_COLOR

  return (
    <div className={cn('relative w-full overflow-visible', className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dotColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={dotColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* A faint fill under the close-price line gives the chart a floor to
            sit on, the same role the old line chart's area fill played. */}
        <path
          d={`M0 ${height} ${series.map((c, i) => `L${(i + 0.5) * slot} ${toY(c.c)}`).join(' ')} L${width} ${height} Z`}
          fill={`url(#${gradientId})`}
        />

        {series.map((candle, i) => {
          const x = (i + 0.5) * slot
          const up = candle.c >= candle.o
          const color = up ? UP_COLOR : DOWN_COLOR
          const yHigh = toY(candle.h)
          const yLow = toY(candle.l)
          const yOpen = toY(candle.o)
          const yClose = toY(candle.c)
          const bodyTop = Math.min(yOpen, yClose)
          const bodyHeight = Math.max(1, Math.abs(yClose - yOpen))

          return (
            <g key={candle.t}>
              <line
                x1={x} y1={yHigh} x2={x} y2={yLow}
                stroke={color}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <rect
                x={x - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
              />
            </g>
          )
        })}

        {/* Dashed current-price line, matching the "MID" reference line
            convention of a real trading terminal. */}
        <line
          x1="0" y1={lastY} x2={width} y2={lastY}
          stroke={dotColor}
          strokeWidth="1"
          strokeDasharray="4 4"
          strokeOpacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {showDot && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(lastX / width) * 100}%`,
            top: `${(lastY / height) * 100}%`,
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
  )
}
